import '../libs/loadEnv.lib.js';

import type { Request, Response } from 'express';
import type { ServantAppOptions } from '../../types/servant-app.config.type.js'

import express, { type Express } from 'express';
import session from 'express-session';

import { SESSION_CONFIG } from '../configs/session.config.js';

import { errorHandler } from '../middlewares/errorHandler.middleware.js';
import { mainRateLimit } from './createRateLimiter.lib.js';
import { createSessionRouter } from '../routers/session.router.js';
import { createContractsRouter } from '../routers/db/contracts.router.js';
import { createFunctionSelectorsRouter } from '../routers/db/functionSelectors.router.js';
import { createUserFunctionSelectorApprovalsRouter } from '../routers/db/userFunctionSelectorApprovals.router.js';
import { createExecutorRouter } from '../routers/executor.router.js';

/**
 * Creates and configures an Express application instance with middleware, routes, and error handling.
 * 
 * This factory function enables flexible configuration for different environments (e.g., production vs testing).
 * By default, security features like rate limiting are enabled to ensure production safety.
 * In test environments, rate limiting can be disabled via the `enableRateLimiter` option to avoid flaky tests.
 * 
 * @param {Object} options - Configuration options for the Express app.
 * @param {boolean} [options.enableRateLimiter=true] - Whether to apply the rate limiting middleware. 
 *                                                    Set to `false` in tests to bypass request throttling.
 * 
 * @returns {Express} A fully configured Express application instance.
 * 
 * @example
 * // Production usage (default)D
 * const app = createExpressApplication();
 * 
 * @example
 * // Test usage (rate limiter disabled)
 * const app = createExpressApplication({ enableRateLimiter: false });
 * 
 * @example
 * // Test usage (rate limiter explicitly enabled for middleware tests)
 * const app = createExpressApplication({ enableRateLimiter: true });
 */
export const createApp = (options: ServantAppOptions = {}): Express => {
    options['enableSession'] = options.enableSession ?? true;
    options['enableRateLimiter'] = options.enableRateLimiter ?? true;

    const app: Express = express();
    // Middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(session(SESSION_CONFIG))

    app.use(mainRateLimit); // Spam protection

    app.get('/', (req: Request, res: Response) => {
        res.send(`Welcome to the WealthOS Servant Module API.`);
    })

    app.use('/session', createSessionRouter(options));
    app.use('/execute', createExecutorRouter(options));
    app.use('/db/contracts', createContractsRouter(options));
    app.use('/db/function_selectors', createFunctionSelectorsRouter(options));
    app.use('/db/user_function_selector_approvals', createUserFunctionSelectorApprovalsRouter(options));

    // Middleware
    app.use(errorHandler);

    return app;
}