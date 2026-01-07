import requests
from django.shortcuts import render, redirect
from django.contrib import messages
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import SeedImage
from dotenv import load_dotenv
import os
import base64
from . import feature_hasher
from PIL import Image, ImageDraw, ImageFont
import io
import hashlib
import json
from pgvector.django import CosineDistance

load_dotenv()

# ML Server URL (from environment or default to localhost for local dev)
COLAB_URL = os.getenv("url", "http://localhost:8001")

BLOCKCHAIN_TYPE = {
    "fabric": os.getenv("FABRIC_URL", "http://localhost:3000"),
    "sawtooth": os.getenv("SAWTOOTH_URL", "http://localhost:9000")
}

ML_API_KEY = os.getenv('ML_API_KEY', 'default-dev-key')


# ============== Helper Functions ==============

def get_inference(image_file):
    """Call ML server for inference and return detections"""
    files = {"file": image_file}
    headers = {"X-API-Key": ML_API_KEY}
    response = requests.post(f"{COLAB_URL}/predict/", files=files, headers=headers, timeout=30)
    response.raise_for_status()

    data = response.json()
    detections = data.get("results", [])
    processing_time = data.get("processing_time_ms")
    image_size = data.get("image_size", {})

    return detections, processing_time, image_size


def compute_seed_hash(embedding, confidence, quality):
    """Compute SHA256 hash of seed data for blockchain"""
    # Handle numpy arrays
    if hasattr(embedding, 'tolist'):
        embedding = embedding.tolist()
    elif embedding is None:
        embedding = []

    data = {
        "embedding": embedding,
        "confidence": confidence,
        "quality": quality
    }
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()


def find_similar_seed(embedding, threshold=0.1):
    """Find similar seed by embedding with configurable threshold"""
    return SeedImage.objects.annotate(
        distance=CosineDistance('embedding', embedding)
    ).filter(distance__lt=threshold).order_by('distance').first()


def create_annotated_image(image_file, detections):
    """Draw bounding boxes on image and return as base64"""
    # Open image
    img = Image.open(image_file)
    draw = ImageDraw.Draw(img)

    # Draw each bounding box
    for detection in detections:
        bbox = detection.get("bbox")
        if bbox:
            x1, y1, x2, y2 = bbox
            offset = 2
            draw.rectangle([x1-offset, y1-offset, x2+offset, y2+offset], outline="#000000", width=16)
            draw.rectangle([x1, y1, x2, y2], outline="#4caf50", width=12)

    # Convert to base64
    buffer = io.BytesIO()
    img.save(buffer, format='JPEG')
    img_bytes = buffer.getvalue()
    img_b64 = base64.b64encode(img_bytes).decode('utf-8')

    return img_b64


@csrf_exempt
def upload_seed(request):
    """Upload seed image and get YOLO + CNN predictions from Colab"""
    if request.method == "POST":
        image = request.FILES.get("image")

        if not image:
            return JsonResponse({"error": "No image uploaded"}, status=400)

        try:
            # Send to FastAPI inference server (ngrok URL)
            detections, processing_time, image_size = get_inference(image)

            if not detections:
                return JsonResponse({"error": "No seeds detected in image"}, status=400)

            saved_seeds = []

            # Loop through ALL detections instead of just first one
            for detection in detections:
                # Check for duplicate
                new_embedding = detection.get("embedding")
                if new_embedding:
                    existing_seed = find_similar_seed(new_embedding, threshold=0.01)

                    if existing_seed:
                        saved_seeds.append({
                            "status": "duplicate",
                            "existing_seed_id": existing_seed.id,
                            "bbox": detection.get("bbox")
                        })
                        continue

                # Decode cropped image from base64
                from django.core.files.base import ContentFile
                cropped_b64 = detection.get("cropped_image")

                if not cropped_b64:
                    # ML server didn't return cropped image, skip this detection
                    continue

                cropped_data = base64.b64decode(cropped_b64)
                cropped_file = ContentFile(cropped_data, name=f"crop_{image.name}")

                # Save each seed as separate record with cropped image
                seed_record = SeedImage.objects.create(
                    image=cropped_file,  # Save the cropped image, not original
                    detections=[detection],
                    processing_time_ms=processing_time,
                    image_width=image_size.get("width"),
                    image_height=image_size.get("height"),
                    original_image_path=image.name,  # Reference to original uploaded file
                    bbox=detection.get("bbox"),  # Bounding box for this specific seed
                    prediction=detection.get("class"),
                    confidence=detection.get("confidence"),
                    quality=detection.get("quality"),
                    embedding=detection.get("embedding"),
                )

                saved_seeds.append({
                    "status": "saved",
                    "id": seed_record.id,
                    "bbox": detection.get("bbox"),
                    "class": detection.get("class"),
                    "confidence": detection.get("confidence"),
                    "image_url": seed_record.image.url
                })

            # Create annotated image with bounding boxes
            image.seek(0)  # Reset file pointer
            annotated_image_b64 = create_annotated_image(image, detections)

            return JsonResponse({
                "seeds": saved_seeds,
                "total_detected": len(detections),
                "total_saved": len([s for s in saved_seeds if s["status"] == "saved"]),
                "total_duplicates": len([s for s in saved_seeds if s["status"] == "duplicate"]),
                "processing_time_ms": processing_time,
                "image_size": image_size,
                "annotated_image": annotated_image_b64,
            })

        except requests.exceptions.RequestException as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def certify_seed(request):
    """Certify a seed and write to blockchain (FR-4)"""
    if request.method == "POST":
        seed_id = request.POST.get("seed_id")
        blockchain_type = request.POST.get("blockchain_type", "fabric")

        try:
            seed = SeedImage.objects.get(id=seed_id)

            try:
                from datetime import datetime, timezone

                seed_hash = compute_seed_hash(seed.embedding, seed.confidence, seed.quality)

                blockchain_payload = {
                    "seedId": str(seed.id),
                    "className": seed.prediction,
                    "hash": seed_hash,
                    "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
                }

                signer_id = request.POST.get("signer_id", "Nursery_A")
                new_hash = blockchain_payload["hash"]

                try:
                    signature_hex, public_key_hex, signer_name = feature_hasher.sign_hash(new_hash, signer_id)
                    blockchain_payload["signature"] = signature_hex
                    blockchain_payload["publicKey"] = public_key_hex
                    blockchain_payload["signerName"] = signer_name
                except ValueError as e:
                    return JsonResponse({"error": f"Invalid signer: {str(e)}"}, status=400)

                url_1 = BLOCKCHAIN_TYPE.get(blockchain_type)
                url_2 = [url for key, url in BLOCKCHAIN_TYPE.items() if key != blockchain_type]

                try:
                    response = requests.post(f"{url_1}/certify", json=blockchain_payload, timeout=70)
                    if response.status_code == 200:
                        tx_data = response.json()
                        seed.blockchain_tx_id = tx_data.get("transactionId")
                        seed.blockchain_type = tx_data.get("type")
                        seed.signer_name = signer_name
                        seed.save()
                        print(f"Certified on blockchain: {seed.blockchain_type} ({url_1})")
                        return JsonResponse({
                            "success": True,
                            "seed_id": seed.id,
                            "blockchain_tx_id": seed.blockchain_tx_id,
                            "blockchain_type": seed.blockchain_type
                        })
                except Exception as e:
                    print(f"Blockchain {blockchain_type} failed: {e}, trying fallback")
                    for url in url_2:
                        try:
                            response = requests.post(f"{url}/certify", json=blockchain_payload, timeout=70)
                            if response.status_code == 200:
                                tx_data = response.json()
                                seed.blockchain_tx_id = tx_data.get("transactionId")
                                seed.blockchain_type = tx_data.get("type")
                                seed.signer_name = signer_name
                                seed.save()
                                print(f"Certified on blockchain: {seed.blockchain_type} ({url})")
                                return JsonResponse({
                                    "success": True,
                                    "seed_id": seed.id,
                                    "blockchain_tx_id": seed.blockchain_tx_id,
                                    "blockchain_type": seed.blockchain_type
                                })
                        except Exception as e:
                            print(f"Blockchain {url} failed: {e}")
                            continue

                return JsonResponse({"error": "All blockchain certifications failed"}, status=500)
            except Exception as e:
                return JsonResponse({"error": f"Blockchain certification failed: {str(e)}"}, status=500)

        except SeedImage.DoesNotExist:
            return JsonResponse({"error": "Seed not found"}, status=404)

    return JsonResponse({"error": "Method not allowed"}, status=405)


@csrf_exempt
def verify_seed(request):
    """Verify seed authenticity against blockchain using embedding similarity (FR-6)"""
    if request.method == "POST":
        image = request.FILES.get("image")

        if not image:
            return JsonResponse({"error": "image required"}, status=400)

        try:
            # Run inference to detect all seeds
            detections, processing_time, image_size = get_inference(image)

            if not detections:
                return JsonResponse({"error": "No seeds detected in image"}, status=400)

            from django.core.files.base import ContentFile

            verified_seeds = []

            # Process each detection
            for detection in detections:
                new_embedding = detection.get("embedding")
                cropped_b64 = detection.get("cropped_image")

                if not new_embedding or not cropped_b64:
                    continue

                # Search database for similar seed
                similar_seed = find_similar_seed(new_embedding, threshold=0.1)

                # Decode and store cropped image temporarily
                cropped_data = base64.b64decode(cropped_b64)
                cropped_file = ContentFile(cropped_data, name=f"verify_crop.jpg")

                if not similar_seed:
                    # No match found
                    verified_seeds.append({
                        "status": "not_found",
                        "class": detection.get("class"),
                        "confidence": detection.get("confidence"),
                        "cropped_image": cropped_b64,
                        "message": "No matching seed in database"
                    })
                    continue

                # Compute hash for blockchain comparison
                new_hash = compute_seed_hash(
                    new_embedding,
                    detection.get("confidence"),
                    detection.get("quality")
                )

                blockchain_results = {}

                # Check all available blockchains
                for blockchain_name, url in BLOCKCHAIN_TYPE.items():
                    try:
                        bc_response = requests.get(f"{url}/verify/{similar_seed.id}", timeout=10)
                        if bc_response.status_code == 200:
                            stored_record = bc_response.json()
                            # Use tx_id from database if blockchain client doesn't return it
                            tx_id = stored_record.get("transactionId") or similar_seed.blockchain_tx_id
                            blockchain_results[blockchain_name] = {
                                "found": True,
                                "certified": stored_record["hash"] == new_hash,
                                "tx_id": tx_id,
                                "timestamp": stored_record["timestamp"],
                                "signer_name": stored_record.get("signerName")
                            }
                        else:
                            blockchain_results[blockchain_name] = {"found": False, "certified": False}
                    except Exception as e:
                        blockchain_results[blockchain_name] = {"found": False, "certified": False}

                # Determine overall status
                has_blockchain = any(bc["found"] for bc in blockchain_results.values())
                is_certified = any(bc.get("certified") for bc in blockchain_results.values())

                if is_certified:
                    status = "certified"
                elif has_blockchain:
                    status = "found_not_certified"
                else:
                    status = "match_no_blockchain"

                verified_seeds.append({
                    "status": status,
                    "seed_id": similar_seed.id,
                    "class": similar_seed.prediction,
                    "confidence": detection.get("confidence"),
                    "similarity": float(1 - similar_seed.distance),
                    "cropped_image": cropped_b64,
                    "signer_name": similar_seed.signer_name,
                    "blockchains": blockchain_results
                })

            # Create annotated image with bounding boxes
            image.seek(0)  # Reset file pointer
            annotated_image_b64 = create_annotated_image(image, detections)

            return JsonResponse({
                "verifications": verified_seeds,
                "total_detected": len(detections),
                "total_certified": len([s for s in verified_seeds if s["status"] == "certified"]),
                "total_not_found": len([s for s in verified_seeds if s["status"] == "not_found"]),
                "processing_time_ms": processing_time,
                "image_size": image_size,
                "annotated_image": annotated_image_b64
            })

        except requests.exceptions.RequestException as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Method not allowed"}, status=405)


def result(request, pk):
    """Display inference results for a single seed image"""
    seed = SeedImage.objects.get(pk=pk)
    return render(request, "result.html", {"analysis": seed})


def history(request):
    """API: Return all analyzed seed images"""
    seeds = SeedImage.objects.all()
    data = [{
        "id": s.id,
        "image": s.image.url,
        "prediction": s.prediction,
        "confidence": s.confidence,
        "quality": s.quality,
        "blockchain_tx_id": s.blockchain_tx_id,
        "uploaded_at": s.uploaded_at.isoformat(),
    } for s in seeds]
    return JsonResponse(data, safe=False)


def database(request):
    """API: Return database stats and seed records"""
    seeds = SeedImage.objects.all()
    blockchain_synced_count = seeds.exclude(blockchain_tx_id__isnull=True).exclude(blockchain_tx_id="").count()

    data = {
        "total": seeds.count(),
        "blockchain_synced": blockchain_synced_count,
        "records": [{
            "id": s.id,
            "prediction": s.prediction,
            "confidence": s.confidence,
            "quality": s.quality,
            "blockchain_tx_id": s.blockchain_tx_id,
            "blockchain_type": s.blockchain_type,
            "signer_name": s.signer_name,
            "blockchain_synced": bool(s.blockchain_tx_id),
            "uploaded_at": s.uploaded_at.isoformat(),
            "image_url": s.image.url if s.image else None,
            "image_width": s.image_width,
            "image_height": s.image_height,
            "processing_time_ms": s.processing_time_ms,
        } for s in seeds]
    }
    return JsonResponse(data)


@csrf_exempt
def get_signers(request):
    """Get list of available signers/certifiers for dropdown"""
    if request.method == "GET":
        signers = feature_hasher.get_signer_list()
        return JsonResponse({"signers": signers})
    return JsonResponse({"error": "Method not allowed"}, status=405)
