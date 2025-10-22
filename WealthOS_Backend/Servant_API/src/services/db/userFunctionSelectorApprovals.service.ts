import type { UserFunctionSelectorApprovalsData } from "../../../types/db/user-function-selector-approvals.type.js";
import {ApiError} from "../../errors/ApiError.error.js";
import {USER_FUNCTION_SELECTOR_APPROVALS_QUERIES} from "../../models/userFunctionSelectorApprovals.model.js";
import { validateWalletAddress } from "../../utils/validators.util.js";

export const getUserFunctionSelectorsService = async (user_address: `0x${string}`): Promise<UserFunctionSelectorApprovalsData[]> => {
    try {
        if (!validateWalletAddress(user_address)) throw new ApiError('The user address is not valid.', 'BAD_REQUEST');
        return await USER_FUNCTION_SELECTOR_APPROVALS_QUERIES.getUserFunctionSelectorApprovals(user_address);
    } catch (err: unknown) {
        throw err;
    }
}