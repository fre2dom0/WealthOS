import type { Request, Response, NextFunction } from "express";
import { ADDRESS_CONFIG } from "../configs/chain.config.js";
import { ApiError } from "../errors/ApiError.error.js";
import { devLog } from "../utils/consoleLoggers.util.js";

export const isOwnerAddress = (req: Request, res: Response, next: NextFunction) => {
    try {
        devLog(`${req.session.address} is not owner.`, 'INFO');
        if (req.session.address != ADDRESS_CONFIG.owner_account_address) throw new ApiError('Only owner can access.', 'UNAUTHORIZED');
        next();
    } catch (err: unknown) {
        next(err);
    }
}