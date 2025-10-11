import type { ApprovedEvent } from './models/approved.model.js';

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
import { decodeEventLog, hexToBigInt, type Log } from 'viem';
import { errorLog } from './utils/consoleLoggers.util.js';
import { Database } from './libs/database.lib.js';
import { getBlockTimestamp } from './utils/blockchain.util.js';
import { EVENT_TO_EVENT_TABLE } from '../types/database.config.type.js';

// Start database
Database.getInstance(connectionString);

// Start watching events
const unwatch = publicClient.watchEvent({
    address: ADDRESS_CONFIG.servant_contract_address,
    onLogs: logs => {
        const executeQuery = async (data: ApprovedEvent, table: string) => {
            data.block_timestamp = await getBlockTimestamp(data.block_hash);
            const db = Database.getInstance(connectionString);
            const sql = `
                INSERT INTO events.${table} (
                    topics, data, block_hash, block_number, block_timestamp,
                    transaction_hash, transaction_index, log_index, removed,
                    stored_at, args
                ) VALUES (
                    $1, $2, $3, $4, $5,
                    $6, $7, $8, $9,
                    $10, $11
                )
            `;
            console.log(table);
            await db.none(sql, [data.topics, data.data, data.block_hash, data.block_number, data.block_timestamp, data.transaction_hash, data.transaction_index, data.log_index, data.removed, data.stored_at, data.args]);

            if (table == 'approved') {
                const selectors: string[] = data.args.selector;
                console.log(selectors)
                if (selectors.length > 0) {
                    selectors.forEach(async (i) => {
                        console.log(i)
                        await db.none(`INSERT INTO public.user_function_approvals (user_address, function_selector) VALUES ($1, $2 )`, [data.args.user, i]);
                    })
                }
            }
            else if (table == 'revoked') {
                const selectors: string[] = data.args.selector;
                console.log(selectors)
                if (selectors.length > 0) {
                    selectors.forEach(async (i) => {
                        console.log(i)
                        await db.none(`DELETE FROM public.user_function_approvals WHERE user_address = $1 AND function_selector = $2`, [data.args.user, i]);
                    })
                }
            }

        }

        try {
            logs.forEach((l: Log) => {

                const decodedEventLog = decodeEventLog({
                    abi: servant_abi.abi,
                    data: l.data,
                    topics: l.topics
                })
                
                // TODO throw an error
                if (!decodedEventLog.eventName) return;
                const table = EVENT_TO_EVENT_TABLE[decodedEventLog.eventName as string];

                if (!table) return;

                const data: ApprovedEvent = {
                    topics: l.topics,
                    data: l.data,
                    block_hash: l.blockHash!,
                    block_number: l.blockNumber ?? 0n,
                    block_timestamp: 0n,
                    transaction_hash: l.transactionHash!,
                    transaction_index: l.transactionIndex ?? 0,
                    log_index: l.logIndex ?? 0,
                    removed: l.removed ?? false,
                    stored_at: new Date().toISOString(),
                    args: decodedEventLog.args ?? {}
                }

                executeQuery(data, table);
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