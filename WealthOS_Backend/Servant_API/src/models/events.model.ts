import type { EventData, Tables } from "../../types/db/events.type.js";
import type { ApprovedEvent, RevokedEvent } from "../../types/blockchain.type.js";
import { errorLog } from "../utils/consoleLoggers.util.js";
import { Database } from "../libs/database.lib.js";
import { connectionString } from "../configs/database.config.js";

const db = Database.getInstance(connectionString);

export const EVENT_QUERIES = {
    insertEvent: async (data: EventData, table: Tables, is_test: boolean) => {
        try {

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

            return await db.none(sql, [data.topics, data.data, data.block_hash, data.block_number, data.block_timestamp, data.transaction_hash, data.transaction_index, data.log_index, data.removed, data.stored_at, data.args]);
        } catch (err: unknown) {
            errorLog('An error occurred while inserting event: ' + err);
        }

    },

    insertApproval: async (args: ApprovedEvent, is_test: boolean) => {
        try {
            const selectors = args.selector;
            if (args.selector.length == 0) return;
            const user = args.user;

            const values = selectors.map((_: any, i: number) => `($1, $${i + 2})`).join(", ");
            const params = [user, ...selectors];

            return await db.none(
                `INSERT INTO public.user_function_selector_approvals (user_address, function_selector)
                VALUES ${values}
                ON CONFLICT DO NOTHING`,
                params
            );
        }
        catch (err: unknown) {
            errorLog('An error occurred while inserting approval: ' + err);
        }
    },

    deleteApproval: async (args: RevokedEvent, is_test: boolean) => {
        try {
            const selectors: string[] = args.selector;
            if (selectors.length == 0) return;
            const user = args.user;

            return await db.none(
                `DELETE FROM public.user_function_selector_approvals
                    WHERE user_address = $1
                    AND function_selector = ANY($2::text[])`,
                [user, selectors]
            );
        } catch (err: unknown) {
            errorLog('An error occurred while deleting approval: ' + err);
        }
    },
}
