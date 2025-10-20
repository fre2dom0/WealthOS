import type { Request, Response, NextFunction } from "express"
import type { ApiResponse } from "../../../types/response.type.js";

import { getUserFunctionSelectorsService } from "../../services/db/userFunctionSelectorApprovals.service.js";


export const getUserFunctionSelectorApprovalsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_address: `0x${string}` = req.query.user_address as `0x${string}`;

        const response: ApiResponse = {
            data: await getUserFunctionSelectorsService(user_address),
            message: 'Approved function selectors of user successfully fetched!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err)
    }
}