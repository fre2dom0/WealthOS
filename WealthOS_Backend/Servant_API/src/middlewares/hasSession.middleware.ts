import type { Request, Response, NextFunction } from "express";
import { ApiError } from "../errors/ApiError.error.js";

export const hasSession = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.session.address) throw new ApiError('No session found.', 'NO_SESSION');
        next();
    } catch (err: unknown) {
        next(err);
    }
}