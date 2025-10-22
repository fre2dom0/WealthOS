import type { UserFunctionSelectorApprovalsData } from '../../types/db/user-function-selector-approvals.type.js';
import { connectionString } from '../configs/database.config.js';
import { Database } from '../libs/database.lib.js';

const db = Database.getInstance(connectionString);

export const USER_FUNCTION_SELECTOR_APPROVALS_QUERIES = {
    getUserFunctionSelectorApprovals: async (userAddress: `0x${string}`): Promise<UserFunctionSelectorApprovalsData[]> => {
        return await db.query('SELECT * FROM public.user_function_selector_approvals WHERE user_address = $1', [userAddress]);
    }
}