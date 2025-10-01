import { closeSpinner } from "../server.js";
import type { Request, Response, NextFunction } from "express";

/**
 * Closes the spinner animation in console.
 */
export const spinnerCloser = (req: Request, res: Response, next: NextFunction) => {
    closeSpinner();
    next();
}