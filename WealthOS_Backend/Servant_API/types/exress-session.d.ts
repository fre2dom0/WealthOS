import 'express-session';

type SessionNonce = {
    value: string;
    expiresAt: number;
}

declare module 'express-session' {
    interface SessionData {
        address?: `0x${string}`; 
        nonce?: SessionNonce
    }
}