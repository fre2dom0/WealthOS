import type { EventName } from "../blockchain.type.js"

export type Tables = 'approved' | 'revoked' | 'executed';

export interface EventData {
    topics: string[];
    data: string;
    block_hash: `0x${string}`;
    block_number: bigint;
    block_timestamp: bigint;
    transaction_hash: `0x${string}`;
    transaction_index: number;
    log_index: number;
    removed: boolean;
    stored_at: string; // ISO string
    args: Record<string, any>; // jsonb
}

export const EVENT_TO_EVENT_TABLE: Record<EventName, Tables> = {
    'Approved': 'approved',
    "Revoked": 'revoked',
    "Executed": 'executed'
}