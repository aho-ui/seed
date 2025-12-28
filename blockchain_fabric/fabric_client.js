// Minimal Fabric Gateway Client (JavaScript)
// Run in WSL2: node fabric_client.js

const { connect, signers } = require('@hyperledger/fabric-gateway');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const grpc = require('@grpc/grpc-js');
const express = require('express');

const app = express();
app.use(express.json());

// Configuration
const channelName = 'mychannel';
const chaincodeName = 'seed';
const mspId = 'Org1MSP';

// Paths to crypto material
const cryptoPath = path.resolve(__dirname, 'organizations', 'peerOrganizations', 'org1.example.com');
const certDir = path.join(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'signcerts');
const certPath = path.join(certDir, fs.readdirSync(certDir)[0]);
const keyPath = path.join(cryptoPath, 'users', 'User1@org1.example.com', 'msp', 'keystore');
const tlsCertPath = path.join(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt');

// Get private key
function getPrivateKey() {
    const keyFiles = fs.readdirSync(keyPath);
    const keyFile = keyFiles.find(file => file.endsWith('_sk'));
    return fs.readFileSync(path.join(keyPath, keyFile));
}

// Create gRPC client
function newGrpcConnection() {
    const tlsRootCert = fs.readFileSync(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    const peerEndpoint = process.env.PEER_ENDPOINT || 'peer0.org1.example.com:7051';
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': 'peer0.org1.example.com',
    });
}

// Create identity
function newIdentity() {
    const credentials = fs.readFileSync(certPath);
    return { mspId, credentials };
}

// Create signer
function newSigner() {
    const privateKeyPem = getPrivateKey();
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// Initialize gateway
let contract;

async function initGateway() {
    const client = newGrpcConnection();
    const gateway = connect({
        client,
        identity: newIdentity(),
        signer: newSigner(),
    });

    const network = gateway.getNetwork(channelName);
    contract = network.getContract(chaincodeName, 'SeedContract');
    console.log('Connected to Fabric Gateway');
}

// API Routes

// Create seed record (certification)
app.post('/certify', async (req, res) => {
    try {
        const { seedId, className, hash, timestamp } = req.body;
        console.log(`[CERTIFY] Received request for seedId: ${seedId}`);
        console.log(`[CERTIFY] className: ${className}, hash: ${hash?.substring(0, 16)}...`);

        const resultBytes = await contract.submitTransaction(
            'CreateSeedRecord',
            seedId,
            className,
            hash,
            timestamp
        );
        const resultString = Buffer.from(resultBytes).toString('utf8');
        console.log('[CERTIFY] Raw chaincode response:', resultString);
        const record = JSON.parse(resultString);
        const txId = record.tx_id;
        console.log(`[CERTIFY] SUCCESS: Certified seedId: ${seedId}, txId: ${txId}`);
        res.json({
            success: true,
            message: 'Seed certified on blockchain',
            seedId,
            transactionId: txId,
            type: 'fabric'
        });
    } catch (error) {
        console.error(`[CERTIFY] ERROR:`, error.message);
        res.status(500).json({ error: error.message });
    }
});

// Get seed record (verification)
app.get('/verify/:seedId', async (req, res) => {
    try {
        const seedId = req.params.seedId;
        console.log(`[VERIFY] Querying blockchain for seedId: ${seedId}`);

        const resultBytes = await contract.evaluateTransaction(
            'GetSeedRecord',
            seedId
        );

        const resultString = Buffer.from(resultBytes).toString('utf8');
        const result = JSON.parse(resultString);
        console.log(`[VERIFY] SUCCESS: Found record for seedId: ${seedId}, hash: ${result.hash?.substring(0, 16)}...`);
        res.json(result);
    } catch (error) {
        console.error(`[VERIFY] ERROR for seedId ${req.params.seedId}:`, error.message);
        res.status(404).json({ error: 'Seed not found or invalid' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', blockchain: 'fabric' });
});

// Start server
const PORT = 3000;

initGateway()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Fabric client API running on http://localhost:${PORT}`);
            console.log(`Test: curl http://localhost:${PORT}/health`);
        });
    })
    .catch(error => {
        console.error('Failed to connect to blockchain:', error);
        process.exit(1);
    });
