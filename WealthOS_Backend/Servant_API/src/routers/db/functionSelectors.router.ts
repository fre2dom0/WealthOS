import type { ServantAppOptions } from "../../../types/servant-app.config.type.js";
import { Router } from "express";
import { useRateLimit } from "../../libs/createRateLimiter.lib.js";
import { isOwnerAddress } from "../../middlewares/isOwnerAddress.middleware.js";
import { getAllFunctionSelectorsController, getContractFunctionSelectorsController, insertFunctionSelectorsController, deleteFunctionSelectorsController, deleteContractFunctionSelectorsController } from "../../controllers/db/functionSelectors.controller.js";
import { nullFilterer } from "../../utils/filterers.util.js";


export const createFunctionSelectorsRouter = (options?: ServantAppOptions) => {
    const router = Router();

    const isSessionEnable = options?.enableSession;
    const isRateLimiterEnable = options?.enableRateLimiter;


    router.get(
        '/all_function_selectors',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 50, windowS: 60, prefix: 'get-all-function-selectors' }) : null
        ),
        getAllFunctionSelectorsController
    );

    router.get(
        '/contract_function_selectors',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 50, windowS: 60, prefix: 'get-contract-function-selectors' }) : null
        ),
        getContractFunctionSelectorsController
    );

    router.post(
        '/insert_function_selectors',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 5, windowS: 60, prefix: 'post-insert-function-selectors' }) : null,
            isSessionEnable ? isOwnerAddress : null
        ),
        insertFunctionSelectorsController
    );

    router.delete(
        '/delete_function_selectors',
        ...nullFilterer(
            isRateLimiterEnable ? useRateLimit({ limit: 5, windowS: 60, prefix: 'delete-function-selectors' }) : null,
            isSessionEnable ? isOwnerAddress : null
        ),
        deleteFunctionSelectorsController
    );

    router.delete(
        '/delete_contract_function_selectors',
        ...nullFilterer(
            isRateLimiterEnable? useRateLimit({ limit: 5, windowS: 60, prefix: 'delete-contract-function-selectors' }): null,
            isSessionEnable ? isOwnerAddress : null
        ),
        deleteContractFunctionSelectorsController
    );

    return router;
};