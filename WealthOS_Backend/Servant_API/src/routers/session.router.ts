import { checkSessionController, createSessionController, getSessionController, nonceController } from "../controllers/session.controller.js";
import { Router } from "express";
import type { ServantAppOptions } from "../../types/servant-app.config.type.js";
import { useRateLimit } from "../libs/createRateLimiter.lib.js";



const createSessionRouter = (options?: ServantAppOptions) => {
    const router = Router();
    
    if (options && options.enableRateLimiter) {
        router.post('/create_session', useRateLimit({limit: 5, windowS: 15 * 60, prefix: 'post-create-session'}), createSessionController);
        router.get('/nonce', useRateLimit({limit: 5, windowS: 15 * 60, prefix: 'get-nonce'}), nonceController);
        router.get('/check_session', useRateLimit({limit: 50, windowS: 60, prefix: 'get-check-session'}), checkSessionController);
        router.get('/fetch_session', useRateLimit({limit: 50, windowS: 60, prefix: 'get-fetch-session'}), getSessionController)
    } else {
        router.post('/create_session', createSessionController);
        router.get('/nonce', nonceController);
        router.get('/check_session', checkSessionController);
        router.get('/fetch_session', getSessionController)
    }

    return router;
}

export default createSessionRouter;
