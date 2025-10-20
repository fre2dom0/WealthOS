import { devLog } from "../utils/consoleLoggers.util.js";
import { createRandomString } from "../utils/createRandom.util.js";
import { verifyMessageSignature } from "../libs/verifyMessageSignature.lib.js";
import type { SessionData } from "express-session";
import ApiError from "../errors/ApiError.error.js";

/**
 * Creates a user session by storing the wallet address and initializing session data.
 * 
 * @param address - The user's Ethereum address in 0x format to be stored in the session
 * @throws Will throw if session operation fails
 */
export const createSessionService = async (session: Partial<SessionData>, address: `0x${string}`, signature: `0x${string}`, nonce: string) => {
    try {   
        // Nonce check
        if (session.nonce && session.nonce.value != nonce) throw new ApiError('Nonce mismatches while verifying signature.', 'UNAUTHORIZED');
        else if (session.nonce && session.nonce.expiresAt < Date.now()) throw new ApiError('Nonce expired.', 'UNAUTHORIZED');

        // Sign and check message
        const message = `Please sign the message to create user session. Nonce : ${nonce}`
        const isVerified = await verifyMessageSignature({address, message, signature}, nonce); 
        if (!isVerified) throw new ApiError('Invalid signature. Please ensure the message and signature are correct.', 'UNAUTHORIZED')   

        // Delete nonce and create session
        delete session.nonce;
        session.address = address;
        
        devLog(`Session successfully created : ${session.address}`, 'SUCCESS'); 
    } catch (err: unknown) {
        throw err;
    }
}

/**
 * Checks if an active session exists for the user.
 * 
 * @returns `true` if a session exists (i.e., wallet address is set), `false` otherwise
 * @throws Will throw if session access fails
 */
export const checkSessionService = (sessionID: string, session: Partial<SessionData>): boolean => {
    try {
        let availability: boolean = false;
        
        if (session.address) {
            availability = true;
        }

        if (availability) {
            devLog(`${sessionID} - ${session.address} has a session.`, 'SUCCESS');
        } else {
            devLog(`${sessionID} has no session.`, 'DENIED');
        } 

        return availability
    } catch (err: unknown) {
        throw err;
    }
}


/**
 * Generates a cryptographically secure random nonce and stores it in the session with an expiration time.
 * 
 * @returns The generated nonce string
 * @throws Will throw if nonce generation or session storage fails
 */
export const nonceService = (session: Partial<SessionData>): string => {
    try {
        const nonce = createRandomString(30);
        
        const expireTime = Date.now() + 5 * 60 * 1000; // Expires after 5 minutes
        session.nonce = {
            value: nonce,
            expiresAt: expireTime
        };

        devLog(`Nonce successfully created: ${nonce}`, 'SUCCESS');
        return nonce;
    } catch (err: unknown) {
        throw err;
    }
}