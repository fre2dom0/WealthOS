import type { Request, Response, NextFunction } from "express"
import type { ApiResponse } from "../../types/response.type.js";

import { validateData } from "../utils/validators.util.js";

import ApiError from "../errors/ApiError.error.js";
import { checkSessionService, createSessionService, nonceService } from "../services/session.service.js";
import API_CONFIG from "../configs/api.config.js";

export const createSessionController = async (req: Request, res: Response, next: NextFunction) => {
    try {   
        const { address, signature, nonce } = req.body;
        validateData({ address, signature, nonce }, true); 

        await createSessionService(req.session, address, signature, nonce);

        const response: ApiResponse = {
            message: 'Session successfully created!',
            code: 'SUCCESS'
        }
        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}

export const checkSessionController= (req: Request, res: Response, next: NextFunction) => {
    try {
        const availability = checkSessionService(req.sessionID, req.session);
        const response: ApiResponse = {
            data: availability,
            message: availability ? 'Session found.' : 'No session found.',
            code: 'SUCCESS'
        }

        res.status(200).json(response)
    } catch (err: unknown) {
       next(err);
    }
}

export const nonceController = (req: Request, res: Response, next: NextFunction) => {
    try {
        if (req.session.address && !API_CONFIG.is_test) throw new ApiError('You already have a session', 'UNAUTHORIZED');
        
        const nonce = nonceService(req.session);
        const response: ApiResponse = {
            data: nonce,
            message: 'Nonce successfully created!',
            code: 'SUCCESS'
        }

        res.status(200).json(response)
    } catch (err: unknown) {
        next(err);
    }
}

export const getSessionController = (req: Request, res: Response) => {
    if (API_CONFIG.node_env == 'development') {
        res.status(200).json(req.session);
    } else {
        res.status(403)
    }
}