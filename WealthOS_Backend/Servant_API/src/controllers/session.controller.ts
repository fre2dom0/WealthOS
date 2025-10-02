import type { Request, Response, NextFunction } from "express"
import type { ApiResponse } from "../../types/response.type.js";

import { validateData } from "../utils/validators.util.js";
import { verifyMessageSignature } from "../libs/verifyMessageSignature.lib.js";

import ApiError from "../errors/ApiError.error.js";
import { checkSessionService, createSessionService, nonceService } from "../services/session.service.js";
import { devLog } from "../utils/consoleLoggers.util.js";
import API_CONFIG from "../configs/api.config.js";

export const createSessionController = async (req: Request, res: Response, next: NextFunction) => {
    try {   
        const { address, signature, nonce } = req.body;
        validateData({ address, signature, nonce }, true); 

        // Nonce check
        if (req.session.nonce && req.session.nonce.value != nonce) throw new ApiError('Nonce mismatches while verifying signature.', 'UNAUTHORIZED');
        else if (req.session.nonce && req.session.nonce.expiresAt < Date.now()) throw new ApiError('Nonce expired.', 'UNAUTHORIZED');

        // Sign and check message
        const message = `Please sign the message to create user session. Nonce : ${nonce}`
        const isVerified = await verifyMessageSignature({address, message, signature}, nonce); 
        if (!isVerified) throw new ApiError('Invalid signature. Please ensure the message and signature are correct.', 'UNAUTHORIZED')   

        // Delete nonce and create session
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
        if (req.session.address && !API_CONFIG.is_test) throw new ApiError('You already have a session', 'UNAUTHORIZED');
        
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