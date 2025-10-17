import type { EventName, EventArgsMap, ApprovedEvent, RevokedEvent } from '../../types/blockchain.type.js';

import { publicClient } from './blockchain.lib.js';
import { decodeEventLog, type Log } from 'viem';
import { devLog, errorLog } from '../utils/consoleLoggers.util.js';
import { EVENT_TO_EVENT_TABLE, type EventData, type Tables } from '../../types/database.type.js';
import databaseModel from '../models/database.model.js';
import { getBlockTimestamp } from '../utils/blockchain.util.js';
import ADDRESS_CONFIG from '../configs/chain.config.js';
import servant_abi from '../configs/jsons/servant_artifact.json' with {type: 'json'};
import ApiError from '../errors/ApiError.error.js';
import API_CONFIG from '../configs/api.config.js';



export const processServantEvents = async (logs: Log<bigint, number, false, undefined, undefined, undefined, undefined>[]) => {
    const isTest: boolean = API_CONFIG.is_test;
    for (const l of logs) {
        try {
            devLog('An event found', 'SUCCESS');
            const decodedEventLog = decodeEventLog({
                abi: servant_abi.abi,
                data: l.data,
                topics: l.topics,
            });

            if (!decodedEventLog.eventName) throw new ApiError('No event name found.');
            const eventName: EventName = decodedEventLog.eventName;
            const validEvents = ['Approved', 'Revoked', 'Executed'] as const;
            if (!validEvents.includes(eventName)) throw new ApiError('Not a valid event: ', eventName);
            devLog(`Event name : ${eventName}`, 'INFO');

            const table: Tables = EVENT_TO_EVENT_TABLE[eventName];
            devLog(`Table : ${table}`, 'INFO');
            if (!table) throw new ApiError('No table found for this event...');

            const data: EventData = {
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

            await databaseModel.insertEvent(data, table, isTest);

            switch (eventName) {
                case "Approved":
                    const approved_args = decodedEventLog.args as unknown as ApprovedEvent;
                    await databaseModel.insertApproval(approved_args, isTest);
                    break;
                case "Revoked":
                    const revoked_args = decodedEventLog.args as unknown as RevokedEvent;
                    await databaseModel.deleteApproval(revoked_args, isTest);
                    break;
                default:
                    break;
            }
        } catch (err) {
            errorLog(`An error occurred while watching servant events: ${err}`)
            throw err;
        }
    }
}

export const watchServantEvents = async () => {
    const unwatch = publicClient.watchEvent({
        address: ADDRESS_CONFIG.servant_contract_address,
        onLogs: async (logs) => {
            processServantEvents(logs);
        },
    });

    return unwatch;
}
