import type {ExtendedLog} from '../types/viem-extended.type.js'

import './libs/loadEnv.lib.js';
import './configs/api.config.js';
import './configs/chain.config.js';
import './configs/database.config.js';

import API_CONFIG from "./configs/api.config.js";
import ADDRESS_CONFIG from './configs/chain.config.js';
import DATABASE_CONFIG, { connectionString } from './configs/database.config.js';
import servant_abi from './configs/jsons/servant_artifact.json' with {type: 'json'};

import createApp from "./libs/createApp.lib.js";
import { publicClient } from './libs/blockchain.lib.js';
import { decodeEventLog } from 'viem';
import { errorLog } from './utils/consoleLoggers.util.js';
import { Database } from './libs/database.lib.js';

// Start database
Database.getInstance(connectionString);

// Start watching events
const unwatch = publicClient.watchEvent({
    address: ADDRESS_CONFIG.servant_contract_address,
    onLogs: logs => {
        const executeQuery = async (data: object, table: string) => {
            const db = Database.getInstance(connectionString);
            const sql = `
                INSERT INTO events.approved (
                    topics, data, block_hash, block_number, block_timestamp,
                    transaction_hash, transaction_index, log_index, removed,
                    stored_at, args
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9,
                    $10, $11
                )
            `;
        }

        try {
            logs.forEach((l: ExtendedLog) => {
                const decodedEventLog = decodeEventLog({
                    abi: servant_abi.abi,
                    data: l.data,
                    topics: l.topics
                })
                
                const data = {
                    topics: l.topics,
                    data: l.data,
                    block_hash: l.blockHash,
                    block_number: l.blockNumber,
                    block_timestamp: l.blockTimestamp,
                    transaction_hash: l.transactionHash,
                    transaction_index: l.transactionIndex,
                    log_index: l.logIndex,
                    removed: l.removed,
                    stored_at: new Date().toISOString(),
                    args: JSON.stringify(decodedEventLog.args)
                }

                console.log('Decoded event log : ');
                console.log(decodedEventLog);
                // decoded
                
                
            })
        } catch (err: unknown) {
            errorLog(`An error occurred while watching events : ${err}`);
        }
    }
})

// Start app
const app = createApp();
const PORT = API_CONFIG.port;
export default {app, PORT};