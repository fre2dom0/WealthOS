import type { Request } from 'express';
import {verifyMessage, type VerifyMessageParameters} from 'viem';
import { devLog } from '#src/utils/consoleLoggers.util.js';
import ApiError from '#src/errors/ApiError.error.js';

/**
 * Verifies whether a provided signature matches the given message and wallet address.
 * Expects incoming nonce to match witch session nonce.
 * It also logs verification details in development mode for debugging.
 * 
 * @param {Object} params - The signing parameters
 * @param {`0x${string}`} params.address - The expected Ethereum address that signed the message
 * @param {string} params.message - The original message that was signed
 * @param {`0x${string}`} params.signature - The signature to verify
 * @param {string} nonce - The nonce included in the message, used to prevent replay attacks
 * 
 * @returns {Promise<boolean>} `true` if the signature is valid and matches the address; `false` otherwise
 * 
 * @throws {Error} Throws an error if verification fails or an internal error occurs
 * 
 */
export const verifyMessageSignatureWithNonce = async (req: Request, {address, message, signature}: VerifyMessageParameters, nonce: string): Promise<boolean> => {
    try {
        devLog(`
        📝 Verify Message Signature
        --------------------------
        📍 Address   : ${address}
        💬 Message   : ${message}
        🔢 Nonce     : ${nonce}
        ✍️ Signature : ${signature}
        --------------------------
        `);

        if (req.session.nonce?.value != nonce) throw new ApiError('Nonce mismatchs while verifying signature', 'UNAUTHORIZED');
        else if(req.session.nonce.expiresAt < Date.now()) throw new ApiError('Nonce expired.', 'UNAUTHORIZED');
        const verified = await verifyMessage({address, message, signature});
        return verified;
    } catch (err: unknown) {
        throw err;
    }
    
}