from ecdsa import SigningKey, VerifyingKey, SECP256k1
import hashlib

# Dictionary of authorized signers (nurseries/certifiers)
# In production, this would be loaded from a database or config file
SIGNERS = {
    "Nursery_A": {
        "name": "Green Valley Nursery",
        "private_key": "your_private_key_hex_here_1",
        "public_key": "your_public_key_hex_here_1"
    },
    "Nursery_B": {
        "name": "Palm Paradise Seeds",
        "private_key": "your_private_key_hex_here_2",
        "public_key": "your_public_key_hex_here_2"
    },
    "Nursery_C": {
        "name": "Tropical Seed Co.",
        "private_key": "your_private_key_hex_here_3",
        "public_key": "your_public_key_hex_here_3"
    }
}

def get_signer_list():
    return [
        {"id": signer_id, "name": signer_info["name"]}
        for signer_id, signer_info in SIGNERS.items()
    ]

def get_signer_keys(signer_id):
    if signer_id not in SIGNERS:
        raise ValueError(f"Unknown signer: {signer_id}")

    signer_info = SIGNERS[signer_id]

    # If keys are provided as hex strings, load them
    if signer_info["private_key"].startswith("your_private"):
        # Generate new keys if placeholder is still there
        private_key = SigningKey.generate(curve=SECP256k1)
        public_key = private_key.get_verifying_key()
    else:
        private_key = SigningKey.from_string(
            bytes.fromhex(signer_info["private_key"]),
            curve=SECP256k1
        )
        public_key = VerifyingKey.from_string(
            bytes.fromhex(signer_info["public_key"]),
            curve=SECP256k1
        )

    return private_key, public_key

def sign_hash(hash_hex, signer_id):
    if signer_id not in SIGNERS:
        raise ValueError(f"Unknown signer: {signer_id}")

    # Get signer's keys
    private_key, public_key = get_signer_keys(signer_id)

    # Sign the hash
    hash_bytes = bytes.fromhex(hash_hex)
    signature_bytes = private_key.sign(hash_bytes)

    # Convert to hex
    signature_hex = signature_bytes.hex()
    public_key_hex = public_key.to_string().hex()

    return signature_hex, public_key_hex, SIGNERS[signer_id]["name"]

def verify_signature(hash_hex, signature_hex, public_key_hex):
    try:
        public_key = VerifyingKey.from_string(
            bytes.fromhex(public_key_hex),
            curve=SECP256k1
        )
        hash_bytes = bytes.fromhex(hash_hex)
        signature_bytes = bytes.fromhex(signature_hex)

        public_key.verify(signature_bytes, hash_bytes)
        return True
    except Exception:
        return False

def generate_signer_keypair():
    private_key = SigningKey.generate(curve=SECP256k1)
    public_key = private_key.get_verifying_key()

    private_key_hex = private_key.to_string().hex()
    public_key_hex = public_key.to_string().hex()

    return private_key_hex, public_key_hex
