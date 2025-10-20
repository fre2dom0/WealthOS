import type { Request, Response, NextFunction } from "express";
import ADDRESS_CONFIG from "../configs/chain.config.js";
import ApiError from "../errors/ApiError.error.js";
import { devLog } from "../utils/consoleLoggers.util.js";

export const isUserOrOwnerAddress = (req: Request, res: Response, next: NextFunction) => {
    try {
        const user_address = req.query.user_address as `0x${string}`;
        const session_address = req.session.address as `0x${string}`;
        const owner_address = ADDRESS_CONFIG.owner_account_address;

        if (session_address == undefined) throw new ApiError('No session found.', 'NO_SESSION');
        if (user_address !== session_address && user_address !== owner_address) throw new ApiError('Only owner or user can access.', 'UNAUTHORIZED');
        next();
    } catch (err: unknown) {
        next(err);
    }
}