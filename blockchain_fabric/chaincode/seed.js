// Minimal seed chaincode for Fabric
// Network: 1 org, 1 peer
// Name: seed

'use strict';

const { Contract } = require('fabric-contract-api');

class SeedContract extends Contract {

    // CreateSeedRecord(ctx, seedId, className, hash, timestamp)
    async CreateSeedRecord(ctx, seedId, className, hash, timestamp) {
        const record = {
            seedId: seedId,
            className: className,
            hash: hash,
            timestamp: timestamp,
            tx_id: ctx.stub.getTxID(),
            docType: 'seedRecord'
        };

        await ctx.stub.putState(seedId, Buffer.from(JSON.stringify(record)));
        return JSON.stringify(record);
    }

    // GetSeedRecord(ctx, seedId)
    async GetSeedRecord(ctx, seedId) {
        const recordBytes = await ctx.stub.getState(seedId);

        if (!recordBytes || recordBytes.length === 0) {
            throw new Error(`Seed ${seedId} does not exist`);
        }

        return recordBytes.toString();
    }
}

module.exports = SeedContract;
