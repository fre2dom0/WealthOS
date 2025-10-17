import { checkSessionController, createSessionController, getSessionController, nonceController } from "../controllers/session.controller.js";
import { Router } from "express";
import type { ServantAppOptions } from "../../types/servant-app.config.type.js";
import { useRateLimit } from "../libs/createRateLimiter.lib.js";



const createSessionRouter = (options?: ServantAppOptions) => {
    const router = Router();

    if (options && options.enableRateLimiter) {
    } else {

    }

    return router;
}

export default createSessionRouter;
