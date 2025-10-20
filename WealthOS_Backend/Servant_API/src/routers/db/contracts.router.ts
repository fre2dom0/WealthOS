import type { ServantAppOptions } from "../../../types/servant-app.config.type.js";
import { Router } from "express";
import { deleteContractsController, getAllContractsController, insertContractsController } from "../../controllers/db/contracts.controller.js";
import { useRateLimit } from "../../libs/createRateLimiter.lib.js";
import { isOwnerAddress } from "../../middlewares/isOwnerAddress.middleware.js";
import { nullFilterer } from "../../utils/filterers.util.js";

const createContractsRouter = (options?: ServantAppOptions) => {
    const router = Router();

    const isSessionEnable = !!options?.enableSession;
    const isRateLimiterEnable = !!options?.enableRateLimiter;

    router.get(
        '/all_contracts',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 5, windowS: 60, prefix: 'get-all-contracts' }) : null,
        ),
        // useRateLimit({ limit: 5, windowS: 60, prefix: 'get-all-contracts' }),
        getAllContractsController
    );

    router.post(
        '/insert_contracts',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 5, windowS: 60, prefix: 'post-insert-contracts' }) : null,
            isSessionEnable ? isOwnerAddress : null
        ),
        insertContractsController
    );

    router.delete(
        '/delete_contracts',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 5, windowS: 60, prefix: 'delete-delete-contracts' }) : null,
            isSessionEnable ? isOwnerAddress : null
        ),
        deleteContractsController
    );

    return router;
}

export default createContractsRouter;
