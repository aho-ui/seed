import hashlib
import json
import time
import base64
import requests
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from datetime import datetime
import uvicorn

from sawtooth_signing import create_context
from sawtooth_signing import CryptoFactory
from sawtooth_signing.secp256k1 import Secp256k1PrivateKey

from sawtooth_sdk.protobuf.transaction_pb2 import TransactionHeader, Transaction
from sawtooth_sdk.protobuf.batch_pb2 import BatchList, BatchHeader, Batch


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize on startup"""
    init_signer()

    try:
        response = requests.get(f"{VALIDATOR_URL}/batches")
        log(f"Connected to Sawtooth validator at {VALIDATOR_URL}")
    except Exception as e:
        log(f"Warning: Could not connect to validator: {e}")
        log("Make sure Sawtooth validator is running")

    yield


app = FastAPI(lifespan=lifespan)

# Configuration
VALIDATOR_URL = os.getenv('VALIDATOR_URL', 'http://localhost:8008')
FAMILY_NAME = 'seed'
FAMILY_VERSION = '1.0'
NAMESPACE = hashlib.sha512(FAMILY_NAME.encode()).hexdigest()[:6]

# Global signer
context = None
signer = None
public_key = None


def log(msg):
    """Print timestamped log message"""
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {msg}")


def init_signer():
    """Initialize the cryptographic context and signer"""
    global context, signer, public_key

    context = create_context('secp256k1')
    private_key = Secp256k1PrivateKey.new_random()
    signer = CryptoFactory(context).new_signer(private_key)
    public_key = signer.get_public_key().as_hex()

    log(f"Initialized signer with public key: {public_key[:16]}...")


def _get_address(seed_id):
    """Calculate state address for a seed ID"""
    return NAMESPACE + hashlib.sha512(seed_id.encode()).hexdigest()[:64]


def _create_transaction(payload, inputs, outputs):
    """Create a Sawtooth transaction"""

    payload_bytes = payload.encode()

    txn_header = TransactionHeader(
        family_name=FAMILY_NAME,
        family_version=FAMILY_VERSION,
        inputs=inputs,
        outputs=outputs,
        signer_public_key=public_key,
        batcher_public_key=public_key,
        dependencies=[],
        payload_sha512=hashlib.sha512(payload_bytes).hexdigest()
    ).SerializeToString()

    signature = signer.sign(txn_header)

    txn = Transaction(
        header=txn_header,
        header_signature=signature,
        payload=payload_bytes
    )

    return txn


def _create_batch(transactions):
    """Create a batch from transactions"""

    txn_ids = [txn.header_signature for txn in transactions]

    batch_header = BatchHeader(
        signer_public_key=public_key,
        transaction_ids=txn_ids
    ).SerializeToString()

    signature = signer.sign(batch_header)

    batch = Batch(
        header=batch_header,
        header_signature=signature,
        transactions=transactions
    )

    return batch


def _send_to_validator(batch):
    """Send batch to validator and return batch ID"""

    batch_list = BatchList(batches=[batch])
    batch_bytes = batch_list.SerializeToString()

    response = requests.post(
        f"{VALIDATOR_URL}/batches",
        data=batch_bytes,
        headers={'Content-Type': 'application/octet-stream'}
    )

    if response.status_code not in (200, 201, 202):
        raise Exception(f"Failed to submit batch: {response.text}")

    return batch.header_signature


def _wait_for_commit(batch_id, timeout=60):
    """Wait for batch to be committed"""

    start_time = time.time()

    while time.time() - start_time < timeout:
        try:
            response = requests.get(
                f"{VALIDATOR_URL}/batch_statuses?id={batch_id}",
                timeout=5
            )

            if response.status_code != 200:
                log(f"Batch status check failed: {response.text}")
                time.sleep(2)
                continue

            data = response.json()
            status = data['data'][0]['status']

            log(f"Batch {batch_id[:16]}... status: {status}")

            if status == 'COMMITTED':
                return True
            elif status == 'INVALID':
                log(f"ERROR: Batch {batch_id[:16]}... is INVALID")
                raise Exception(f"Transaction rejected: Invalid ECDSA signature or transaction data")

            time.sleep(2)
        except requests.exceptions.Timeout:
            log(f"Batch status check timed out, retrying...")
            time.sleep(2)
            continue
        except requests.exceptions.RequestException as e:
            log(f"Network error checking batch status: {e}")
            time.sleep(2)
            continue

    log(f"WARNING: Timeout waiting for batch {batch_id[:16]}...")
    return False


# Pydantic models
class CertifyRequest(BaseModel):
    seedId: str
    className: str
    hash: str
    timestamp: str
    signature: str = ""
    publicKey: str = ""


@app.post('/certify')
async def certify(data: CertifyRequest):
    """Create seed record (certification)"""
    try:
        log(f"CERTIFY: Received request for seedId: {data.seedId}")
        log(f"CERTIFY: className: {data.className}, hash: {data.hash[:16] if data.hash else None}...")

        # Create payload
        payload = json.dumps({
            'action': 'create',
            'seedId': data.seedId,
            'className': data.className,
            'hash': data.hash,
            'timestamp': data.timestamp,
            'signature': data.signature,
            'publicKey': data.publicKey
        })

        # Get address
        address = _get_address(data.seedId)

        # Create transaction and batch
        txn = _create_transaction(payload, [address], [address])
        batch = _create_batch([txn])

        # Send to validator
        batch_id = _send_to_validator(batch)

        # Wait for commit
        committed = _wait_for_commit(batch_id)

        if committed:
            log(f"CERTIFY SUCCESS: seedId: {data.seedId}, txId: {txn.header_signature[:16]}...")
        else:
            log(f"CERTIFY WARNING: Batch submitted but confirmation timed out for seedId: {data.seedId}")

        return {
            "success": True,
            "message": "Seed certified on blockchain" if committed else "Seed certification submitted (confirmation pending)",
            "seedId": data.seedId,
            "transactionId": txn.header_signature,
            "committed": committed,
            "type": "sawtooth"
        }

    except Exception as error:
        log(f"CERTIFY ERROR: {str(error)}")
        raise HTTPException(status_code=500, detail=str(error))


@app.get('/verify/{seed_id}')
async def verify(seed_id: str):
    """Get seed record (verification)"""
    try:
        log(f"VERIFY: Querying blockchain for seedId: {seed_id}")

        # Get address
        address = _get_address(seed_id)

        # Query state
        response = requests.get(f"{VALIDATOR_URL}/state/{address}")

        if response.status_code == 404:
            log(f"VERIFY ERROR: seedId {seed_id} not found")
            raise HTTPException(status_code=404, detail='Seed not found or invalid')

        if response.status_code != 200:
            raise Exception(f"Failed to get state: {response.text}")

        # Decode data
        data = response.json()
        record_b64 = data['data']
        record_bytes = base64.b64decode(record_b64)
        record = json.loads(record_bytes.decode())

        log(f"VERIFY SUCCESS: Found record for seedId: {seed_id}, hash: {record.get('hash', '')[:16]}...")

        return record

    except HTTPException:
        raise
    except Exception as error:
        log(f"VERIFY ERROR for seedId {seed_id}: {str(error)}")
        raise HTTPException(status_code=404, detail='Seed not found or invalid')


@app.get('/health')
async def health():
    """Health check endpoint"""
    log("Health check received")
    return {'status': 'ok', 'blockchain': 'sawtooth'}


def main():
    """Main entry point"""
    PORT = 9000
    log(f"Starting Sawtooth client API on http://localhost:{PORT}")
    log(f"Test: curl http://localhost:{PORT}/health")

    uvicorn.run(app, host='0.0.0.0', port=PORT, log_level="info")


if __name__ == '__main__':
    main()
