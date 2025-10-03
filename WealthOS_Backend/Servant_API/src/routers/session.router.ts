import { checkSessionController, createSessionController, getSessionController, nonceController } from "../controllers/session.controller.js";
import { Router } from "express";
import API_CONFIG from "../configs/api.config.js";
import { useRateLimit } from "../configs/rate-limiter.config.js";
import type { ServantAppOptions } from "../../types/servant-app.config.type.js";

export const SESSION_ROUTER_CONFIG = {
    limit: 5
}

const createSessionRouter = (options?: ServantAppOptions) => {
    const router = Router();
    console.log(options)
    if (options && options.enableRateLimiter) {
        const rateLimit = useRateLimit(SESSION_ROUTER_CONFIG.limit)
        router.post('/create_session', rateLimit, createSessionController);
        router.get('/nonce', rateLimit, nonceController);
    } else {
        router.post('/create_session', createSessionController);
        router.get('/nonce', nonceController);
    }

    router.get('/check_session', checkSessionController);
    router.get('/fetch_session', getSessionController)

    return router;
}

export default createSessionRouter;
