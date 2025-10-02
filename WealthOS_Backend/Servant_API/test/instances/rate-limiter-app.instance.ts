import type { Request, Response } from 'express';
import express, { type Express } from 'express';

import { rateLimiter } from '../../src/configs/rate-limiter.config.js';
import { test_error_handler } from '../middlewares/error-handler.middleware.js';

const test_rate_limiter_app: Express = express();

// Middlewares
test_rate_limiter_app.use(express.json());
test_rate_limiter_app.use(express.urlencoded({ extended: true }));
test_rate_limiter_app.use(rateLimiter); // Rate limit

test_rate_limiter_app.get('/', (req: Request, res: Response) => {
    res.send(`Welcome to the WealthOS Servant Module API.`);
})


// Middleware
test_rate_limiter_app.use(test_error_handler);

export default test_rate_limiter_app;