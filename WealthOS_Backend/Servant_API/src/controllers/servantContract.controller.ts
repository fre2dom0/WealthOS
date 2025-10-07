import type { Request, Response, NextFunction } from "express"

export const servantExecuteService = (req: Request, res: Response, next: NextFunction) => {
    try {
        
    } catch (err: unknown) {
        next(err);
    }
}