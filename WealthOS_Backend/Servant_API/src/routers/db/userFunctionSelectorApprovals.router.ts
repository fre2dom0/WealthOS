import type { ServantAppOptions } from "../../../types/servant-app.config.type.js";
import { Router } from "express";
import { useRateLimit } from "../../libs/createRateLimiter.lib.js";
import { nullFilterer } from "../../utils/filterers.util.js";
import { isUserOrOwnerAddress } from "../../middlewares/isUserOrOwnerAddress.middleware.js";
import { getUserFunctionSelectorApprovalsController } from "../../controllers/db/userFunctionSelectorApprovals.controller.js";


export const createUserFunctionSelectorApprovalsRouter = (options?: ServantAppOptions) => {
    const router = Router();

    const isSessionEnable = options?.enableSession;
    const isRateLimiterEnable = options?.enableRateLimiter;

    router.get(
        '/',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 50, windowS: 60, prefix: 'get-user-function-selector-approvals' }) : null,
            isSessionEnable ? isUserOrOwnerAddress : null,
        ),
        getUserFunctionSelectorApprovalsController
    );


    return router;
};