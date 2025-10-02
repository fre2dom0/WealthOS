import type { Request, Response, NextFunction } from "express";
import type { ApiResponseCode } from "../../types/response.type.js";
import ApiError from "../../src/errors/ApiError.error.js";

/**
 * Global error-handling middleware.
 * Normalizes all errors into a consistent JSON response format.
 * Exposes stack traces only in development mode for security.
 */
export const test_error_handler = (err: unknown, req: Request, res: Response, next: NextFunction) => {
    let statusCode = 500;
    let code: ApiResponseCode = "SERVER_ERROR";
    let message = "An unexpected error occurred";
    let stack: string | undefined;

    if (err instanceof ApiError) {
        statusCode = err.statusCode;
        code = err.code;
        message = err.message;
        stack = err.stack;
    } else if (err instanceof Error) {
        message = err.message;
        stack = err.stack;
    } else {
        message = String(err);
    }

    res.status(statusCode).json({
        message,
        code,
        ...(process.env.NODE_ENV === "development" ? { stack } : {})
    });

    next();
};