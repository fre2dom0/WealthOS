import type { ServantAppOptions } from "../../types/servant-app.config.type.js";

import { Router } from "express";
import { nullFilterer } from "../utils/filterers.util.js";
import { useRateLimit } from "../libs/createRateLimiter.lib.js";
import { hasSession } from "../middlewares/hasSession.middleware.js";
import { executorController } from "../controllers/executor.controller.js";

export const createExecutorRouter = (options?: ServantAppOptions) => {
    const router = Router();

    const isSessionEnable = !!options?.enableSession;
    const isRateLimiterEnable = !!options?.enableRateLimiter;

    router.post(
        '/',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 5, windowS: 60, prefix: 'post-execute' }) : null,
            isSessionEnable ? hasSession : null
        ),
        executorController
    );

    return router;
}