import type { ApprovedEvent, Tables } from '../models/database.model.js';

import { publicClient } from '../libs/blockchain.lib.js';
import { decodeEventLog, type Log } from 'viem';
import { errorLog } from '../utils/consoleLoggers.util.js';
import { EVENT_TO_EVENT_TABLE } from '../../types/database.config.type.js';
import databaseModel from '../models/database.model.js';
import { getBlockTimestamp } from '../utils/blockchain.util.js';
import ADDRESS_CONFIG from '../configs/chain.config.js';
import servant_abi from '../configs/jsons/servant_artifact.json' with {type: 'json'};
import { Database } from './database.lib.js';
import { connectionString } from '../configs/database.config.js';

export async function watchServantEvents() {
    const db = Database.getInstance(connectionString); // connectionString zaten içinde varsa gerek yok

    const unwatch = publicClient.watchEvent({
        address: ADDRESS_CONFIG.servant_contract_address,
        onLogs: async (logs) => {
            try {
                for (const l of logs) {
                    const decodedEventLog = decodeEventLog({
                        abi: servant_abi.abi,
                        data: l.data,
                        topics: l.topics,
                    });

                    if (!decodedEventLog.eventName) return;

                    const table: Tables | undefined =
                        EVENT_TO_EVENT_TABLE[decodedEventLog.eventName as string];

                    if (!table) return;

                    const data: ApprovedEvent = {
                        topics: l.topics,
                        data: l.data,
                        block_hash: l.blockHash!,
                        block_number: l.blockNumber ?? 0n,
                        block_timestamp: await getBlockTimestamp(l.blockHash),
                        transaction_hash: l.transactionHash!,
                        transaction_index: l.transactionIndex ?? 0,
                        log_index: l.logIndex ?? 0,
                        removed: l.removed ?? false,
                        stored_at: new Date().toISOString(),
                        args: decodedEventLog.args ?? {},
                    };

                    await databaseModel.insertEvent(data, table);

                    switch (decodedEventLog.eventName) {
                        case "Approved":
                            await databaseModel.insertApproval(decodedEventLog.args as any);
                            break;
                        case "Revoked":
                            await databaseModel.deleteApproval(decodedEventLog.args as any);
                            break;
                        default:
                            break;
                    }
                }
            } catch (err) {
                errorLog(`An error occurred while watching servant events: ${err}`);
            }
        },
    });

    return unwatch; // gerekirse stop ettirebilirsin
}