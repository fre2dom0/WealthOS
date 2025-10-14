import { connectionString } from "../configs/database.config.js";
import { Database } from "../libs/database.lib.js";
import { getBlockTimestamp } from "../utils/blockchain.util.js";

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

export type Tables = 'approved' | 'revoked' | 'executed';

export default {
    insertEvent: async (data: ApprovedEvent, table: string) => {
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

        await db.none(sql, [data.topics, data.data, data.block_hash, data.block_number, data.block_timestamp, data.transaction_hash, data.transaction_index, data.log_index, data.removed, data.stored_at, data.args]);

    },

    insertApproval: async (args: any) => {
        const db = Database.getInstance(connectionString);
        const selectors = args.selector;
        const user = args.user;
        const values = selectors.map((_: any, i: number) => `($1, $${i + 2})`).join(", ");

        const params = [user, ...selectors];

        await db.none(
            `INSERT INTO public.user_function_selector_approvals (user_address, function_selector)
            VALUES ${values}
            ON CONFLICT DO NOTHING`,
            params
        );
    },

    deleteApproval: async (args: any) => {
        const db = Database.getInstance(connectionString);
        const selectors: string[] = args.selector;
        const user = args.user;

        if (selectors.length > 0) {
            await db.none(
                `DELETE FROM public.user_function_selector_approvals
                WHERE user_address = $1
                AND function_selector = ANY($2::text[])`,
                [user, selectors]
            );
        }

    }
}
