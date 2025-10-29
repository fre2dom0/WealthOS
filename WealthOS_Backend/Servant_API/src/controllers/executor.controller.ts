import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../types/response.type.js";
import { executorService } from "../services/executor.service.js";

export const executorController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { contract_address, function_name, args } = req.body;
        const hash = await executorService(req.session.address!, contract_address, function_name, args);

        const response: ApiResponse = {
            data: hash,
            message: 'Successfully executed!',
            code: 'SUCCESS'
        }
        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}