export interface ApprovedEvent {
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
