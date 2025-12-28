from fastapi import FastAPI, File, UploadFile, HTTPException
from pydantic import BaseModel
import io
import time
import base64
from PIL import Image
from datetime import datetime
import torch
import torch.nn.functional as F
import numpy as np

app = FastAPI()


def log(msg):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")

# Global model variables (lazy loaded)
cnn_model = None
cnn_transform = None
class_names = None
yolo_model = None


def load_models():
    """Load YOLO and CNN models on first request"""
    global cnn_model, cnn_transform, class_names, yolo_model

    if cnn_model is None:
        log("Loading CNN model...")
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        checkpoint = torch.load('cnn_best.pth', map_location=device, weights_only=False)
        cnn_model = checkpoint['model']
        cnn_model.eval()
        cnn_model = cnn_model.to(device)
        log(f"CNN model loaded on device: {device}")

        cnn_transform = checkpoint['transform']
        class_names = checkpoint['class_names']

    if yolo_model is None:
        log("Loading YOLO detection model...")
        from ultralytics import YOLO
        yolo_model = YOLO('yolo_best.pt')
        log("YOLO model loaded")


@app.get("/health/")
def health():
    log("Health check received")
    return {"status": "ok"}


class Ping(BaseModel):
    msg: str


# BACKUP: Single-stage CNN only (commented out - using two-stage YOLO+CNN below)
# @app.post("/predict/")
# async def predict(file: UploadFile = File(...)):
#     """
#     CNN classification on full image
#     """
#     log(f"Prediction request: {file.filename}")
#     start_time = time.time()
#
#     try:
#         load_models()
#
#         contents = await file.read()
#         image = Image.open(io.BytesIO(contents)).convert('RGB')
#
#         device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
#         tensor = cnn_transform(image).unsqueeze(0).to(device)
#
#         with torch.no_grad():
#             outputs = cnn_model(tensor)
#             probs = F.softmax(outputs, dim=1)
#             top_conf, top_class = probs.max(1)
#             top_conf = float(top_conf)
#             class_name = class_names[int(top_class)]
#
#             # Extract feature embeddings (digital fingerprint)
#             features = cnn_model.avgpool(cnn_model.layer4(
#                 cnn_model.layer3(cnn_model.layer2(cnn_model.layer1(
#                     cnn_model.maxpool(cnn_model.relu(cnn_model.bn1(cnn_model.conv1(tensor))))
#                 )))
#             ))
#             embedding = features.flatten().cpu().numpy().tolist()
#
#         if top_conf > 0.8:
#             quality = "High"
#         elif top_conf > 0.5:
#             quality = "Medium"
#         else:
#             quality = "Low"
#
#         detections = [{
#             "bbox": [0, 0, image.width, image.height],
#             "class": class_name,
#             "confidence": round(top_conf, 3),
#             "quality": quality,
#             "quality_class": class_name,
#             "quality_confidence": round(top_conf, 3),
#             "embedding": embedding
#         }]
#
#         processing_time = int((time.time() - start_time) * 1000)
#
#         log(f"Completed: {class_name} ({top_conf:.3f}) in {processing_time}ms")
#
#         return {
#             "results": detections,
#             "processing_time_ms": processing_time,
#             "image_size": {"width": image.width, "height": image.height}
#         }
#
#     except Exception as e:
#         log(f"ERROR: {str(e)}")
#         raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")



@app.post("/predict/")
async def predict(file: UploadFile = File(...)):
    """
    Two-stage inference:
    1. YOLO detects objects/regions → bounding boxes
    2. CNN classifies each detected region → quality/class scores
    """
    from ultralytics import YOLO

    log(f"YOLO prediction request: {file.filename}")
    start_time = time.time()

    try:
        load_models()

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')
        img_array = np.array(image)

        # Stage 1: YOLO Detection
        yolo_results = yolo_model(img_array, conf=0.25)
        detections = []

        # Process each detection
        for result in yolo_results:
            if len(result.boxes) == 0:
                log(f"No objects detected in {file.filename}")
            boxes = result.boxes
            for box in boxes:
                # Get bounding box coordinates
                x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()

                # Crop region for CNN classification
                crop = image.crop((int(x1), int(y1), int(x2), int(y2)))

                # Stage 2: CNN Classification
                crop_tensor = cnn_transform(crop).unsqueeze(0)
                if torch.cuda.is_available():
                    crop_tensor = crop_tensor.cuda()

                with torch.no_grad():
                    outputs = cnn_model(crop_tensor)
                    probs = F.softmax(outputs, dim=1)
                    top_conf, top_class = probs.max(1)
                    top_conf = float(top_conf)
                    cnn_class_name = class_names[int(top_class)]

                    # Extract embeddings using adaptive average pooling
                    # Get the output of the last conv layer before fc
                    features = cnn_model.avgpool(cnn_model.layer4(
                        cnn_model.layer3(cnn_model.layer2(cnn_model.layer1(
                            cnn_model.maxpool(cnn_model.relu(cnn_model.bn1(cnn_model.conv1(crop_tensor))))
                        )))
                    ))
                    embedding = features.view(features.size(0), -1).cpu().numpy()[0].tolist()

                if top_conf > 0.8:
                    quality = "High"
                elif top_conf > 0.5:
                    quality = "Medium"
                else:
                    quality = "Low"

                # Convert cropped image to base64
                buffered = io.BytesIO()
                crop.save(buffered, format="JPEG")
                crop_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')

                detections.append({
                    "bbox": [int(x1), int(y1), int(x2), int(y2)],
                    "class": cnn_class_name,
                    "confidence": round(top_conf, 3),
                    "quality": quality,
                    "embedding": embedding,
                    "cropped_image": crop_base64  # Base64 encoded cropped image
                })

        processing_time = int((time.time() - start_time) * 1000)

        log(f"YOLO completed: {len(detections)} detections in {processing_time}ms")

        return {
            "results": detections,
            "processing_time_ms": processing_time,
            "image_size": {"width": image.width, "height": image.height}
        }

    except Exception as e:
        log(f"ERROR: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")