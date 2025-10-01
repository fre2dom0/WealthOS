import type { Request } from "express"
import { devLog } from "#src/utils/consoleLoggers.util.js";
import { createRandomString } from "#src/utils/createRandom.util.js";

/**
 * Creates a user session by storing the wallet address and initializing session data.
 * 
 * @param address - The user's Ethereum address in 0x format to be stored in the session
 * @throws Will throw if session operation fails
 */
export const createSessionService = (req: Request, address: `0x${string}`) => {
    try {   
        req.session.address = address;
        devLog(`✅ Session successfully created : ${req.session.address}`) 
    } catch (err: unknown) {
        throw err;
    }
}

/**
 * Revokes the current user session by destroying it.
 * Currently a placeholder; implement session destruction logic as needed.
 * 
 * @returns void
 * @throws Will throw if session destruction fails
 */
export const revokeSessionService = (req: Request) => {
    try {
        // TODO: Implement session destroy logic, e.g., req.session.destroy()
    } catch (err: unknown) {
        
    }
}

/**
 * Checks if an active session exists for the user.
 * 
 * @returns `true` if a session exists (i.e., wallet address is set), `false` otherwise
 * @throws Will throw if session access fails
 */
export const checkSessionAvailabilityService = (req: Request): boolean => {
    try {
        let availability: boolean = false;
        
        if (req.session.address) {
            availability = true;
        }

        if (availability) {
            devLog(`✅ ${req.sessionID} - ${req.session.address} has a session.`)
        } else {
            devLog(`⛔ ${req.sessionID} has no session.`)
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
export const nonceService = (req: Request): string => {
    try {
        const nonce = createRandomString(30);
        
        const expireTime = Date.now() + 5 * 60 * 1000; // Expires after 5 minutes
        req.session.nonce = {
            value: nonce,
            expiresAt: expireTime
        };

        devLog(`✅ Nonce successfully created: ${nonce}`);
        return nonce;
    } catch (err: unknown) {
        throw err;
    }
}