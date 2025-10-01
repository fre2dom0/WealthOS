import type { Request, Response, NextFunction } from "express"

import { validateData } from "#src/utils/validators.util.js";
import { verifyMessageSignatureWithNonce } from "#src/libs/verifyMessageSignature.lib.js";

import ApiError from "#src/errors/ApiError.error.js";
import { checkSessionService, createSessionService, nonceService } from "#src/services/session.service.js";
import { devLog } from "#src/utils/consoleLoggers.util.js";
import type { ApiResponse } from "#types/response.type.js";
import API_CONFIG from "#src/configs/api.config.js";

export const createSessionController = async (req: Request, res: Response, next: NextFunction) => {
    try {   
        const { address, signature, nonce } = req.body;
        validateData({ address, signature, nonce });

        const message = `Please sign the message to create user session. Nonce : ${nonce}`
        const isVerified = await verifyMessageSignatureWithNonce(req, {address, message, signature}, nonce);

        if (!isVerified) throw new ApiError(
            'Invalid signature. Please ensure the message and signature are correct.', 
            'UNAUTHORIZED'
        )

        delete req.session.nonce;
        createSessionService(req, address);

        const response: ApiResponse = {
            message: 'Session successfully created!',
            code: 'SUCCESS'
        }
        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}

export const revokeSessionController = (req: Request, res: Response) => {
    try {
        
    } catch (err: unknown) {
        
    }
}

export const checkSessionController= (req: Request, res: Response, next: NextFunction) => {
    try {
        const availability = checkSessionService(req);
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
        const nonce = nonceService(req);
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