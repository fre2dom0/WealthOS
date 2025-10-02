import type { Request, Response } from 'express';
import express, { type Express } from 'express';

import { errorHandler } from '../../src/middlewares/errorHandler.middleware.js';
import { useRateLimit } from '../../src/configs/rate-limiter.config.js';

const test_rate_limiter_app: Express = express();

// Middlewares
test_rate_limiter_app.use(express.json());
test_rate_limiter_app.use(express.urlencoded({ extended: true }));
test_rate_limiter_app.use(useRateLimit()); // Rate limit

test_rate_limiter_app.get('/', (req: Request, res: Response) => {
    res.send(`Welcome to the WealthOS Servant Module API.`);
})


// Middleware
test_rate_limiter_app.use(errorHandler);

export default test_rate_limiter_app;