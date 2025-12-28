import hashlib
import json
import logging
from ecdsa import VerifyingKey, SECP256k1, BadSignatureError

from sawtooth_sdk.processor.handler import TransactionHandler
from sawtooth_sdk.processor.exceptions import InvalidTransaction
from sawtooth_sdk.processor.core import TransactionProcessor

LOGGER = logging.getLogger(__name__)

# Family configuration
FAMILY_NAME = 'seed'
FAMILY_VERSION = '1.0'
NAMESPACE = hashlib.sha512(FAMILY_NAME.encode()).hexdigest()[:6]


def _get_address(seed_id):
    """Generate state address for a seed ID"""
    return NAMESPACE + hashlib.sha512(seed_id.encode()).hexdigest()[:64]


class SeedTransactionHandler(TransactionHandler):
    """Transaction handler for seed family"""

    @property
    def family_name(self):
        return FAMILY_NAME

    @property
    def family_versions(self):
        return [FAMILY_VERSION]

    @property
    def namespaces(self):
        return [NAMESPACE]

    def apply(self, transaction, context):
        """Main transaction processor logic"""

        # Parse payload
        try:
            payload = json.loads(transaction.payload.decode())
        except (ValueError, AttributeError) as e:
            raise InvalidTransaction(f"Invalid payload: {e}")

        action = payload.get('action')
        seed_id = payload.get('seedId')

        if not action:
            raise InvalidTransaction("Action is required")
        if not seed_id:
            raise InvalidTransaction("seedId is required")

        LOGGER.info(f"Processing action: {action} for seedId: {seed_id}")

        # Route to appropriate handler
        if action == 'create':
            return self._create_seed_record(
                context,
                seed_id,
                payload.get('className'),
                payload.get('hash'),
                payload.get('timestamp'),
                transaction.signature,
                payload.get('signature', ''),
                payload.get('publicKey', '')
            )
        elif action == 'get':
            return self._get_seed_record(context, seed_id)
        else:
            raise InvalidTransaction(f"Unknown action: {action}")

    def _create_seed_record(self, context, seed_id, class_name, hash_value, timestamp, tx_id, signature_hex='', public_key_hex=''):
        """Create a new seed record"""

        if not class_name:
            raise InvalidTransaction("className is required")
        if not hash_value:
            raise InvalidTransaction("hash is required")
        if not timestamp:
            raise InvalidTransaction("timestamp is required")

        # Verify ECDSA signature if provided
        if signature_hex and public_key_hex:
            try:
                public_key = VerifyingKey.from_string(bytes.fromhex(public_key_hex), curve=SECP256k1)
                signature_bytes = bytes.fromhex(signature_hex)
                hash_bytes = bytes.fromhex(hash_value)

                # Verify signature
                public_key.verify(signature_bytes, hash_bytes)
                LOGGER.info(f"ECDSA signature verified for seed {seed_id}")
            except (BadSignatureError, ValueError) as e:
                raise InvalidTransaction(f"Invalid ECDSA signature: {str(e)}")
        else:
            LOGGER.warning(f"No ECDSA signature provided for seed {seed_id}")

        address = _get_address(seed_id)

        # Check if seed already exists
        existing = context.get_state([address])
        if existing and address in existing:
            raise InvalidTransaction(f"Seed {seed_id} already exists")

        # Create record
        record = {
            'seedId': seed_id,
            'className': class_name,
            'hash': hash_value,
            'timestamp': timestamp,
            'tx_id': tx_id,
            'signature': signature_hex,
            'publicKey': public_key_hex,
            'docType': 'seedRecord'
        }

        # Serialize and store
        record_json = json.dumps(record)

        addresses = context.set_state({
            address: record_json.encode()
        })

        if not addresses:
            raise InvalidTransaction(f"Failed to set state for seedId: {seed_id}")

        LOGGER.info(f"Created seed record: {seed_id}")
        return record_json

    def _get_seed_record(self, context, seed_id):
        """Get an existing seed record"""

        address = _get_address(seed_id)

        state_entries = context.get_state([address])

        if not state_entries or address not in state_entries:
            raise InvalidTransaction(f"Seed {seed_id} does not exist")

        record_bytes = state_entries[address]
        record_json = record_bytes.decode()

        LOGGER.info(f"Retrieved seed record: {seed_id}")
        return record_json


def main():
    """Main entry point for transaction processor"""
    import os

    # Setup logging - use DEBUG to see registration details
    logging.basicConfig(
        level=logging.DEBUG,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )

    # Get validator URL from environment or use default
    validator_url = os.getenv('VALIDATOR_URL', 'tcp://sawtooth-validator:4004')

    # Create processor and register handler
    LOGGER.info(f"Connecting to validator at {validator_url}")
    processor = TransactionProcessor(url=validator_url)
    handler = SeedTransactionHandler()
    processor.add_handler(handler)

    LOGGER.info(f"Starting seed transaction processor")
    LOGGER.info(f"Family: {FAMILY_NAME}, Version: {FAMILY_VERSION}")
    LOGGER.info(f"Namespace: {NAMESPACE}")
    LOGGER.info(f"Handler registered, starting processor...")

    try:
        processor.start()
    except KeyboardInterrupt:
        pass
    except Exception as e:
        LOGGER.error(f"Error starting processor: {e}", exc_info=True)
    finally:
        processor.stop()


if __name__ == '__main__':
    main()
