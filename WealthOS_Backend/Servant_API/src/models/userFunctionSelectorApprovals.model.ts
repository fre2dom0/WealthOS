import type {UserFunctionSelectorApprovalsData} from '../../types/db/user-function-selector-approvals.type.js';

import { db } from "../app.js";

const getUserFuctionSelectorApprovals = async (userAddress: `0x${string}`): Promise<UserFunctionSelectorApprovalsData[]> => {
    return await db.query('SELECT * FROM public.user_function_selector_approvals WHERE user_address = $1', [userAddress]);
}

export default getUserFuctionSelectorApprovals;