# Palm Seed Authentication System

A blockchain-based seed authentication system using computer vision and multi-blockchain verification.

## Setup

**Start the System**
```bash
docker-compose -f docker-compose.block_server.yml up
```

The system will start:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **ML Server**: http://localhost:8001
- **Fabric Blockchain**: http://localhost:3001
- **Sawtooth Blockchain**: http://localhost:9000

## Dataset

### Full Dataset

Download the complete dataset from:
**https://datasetninja.com/weedmaize**

This dataset contains labeled images for training and testing the detection/classification models.

### Sample Dataset

For quick testing, use the `sample/` folder which contains sample images without annotations.
