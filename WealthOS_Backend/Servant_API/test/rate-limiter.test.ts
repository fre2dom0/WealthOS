import type { ApiResponse } from '../types/response.type';
import { RATE_LIMITER_CONFIG, rateLimiter } from '../src/configs/rate-limiter.config';

import { describe, beforeAll, it, expect } from 'vitest';
import request from 'supertest';
import test_rate_limiter_app from './instances/rate-limiter-app.instance';

describe('Middleware - Rate Limiter', async () => {
    const endpoint = '/';
    const agent = request.agent(test_rate_limiter_app);
    const LIMIT = RATE_LIMITER_CONFIG.limit;

    it(`Should throw error if exceeds the limit(${LIMIT})`, async () => {
        let response;
        for (let i = 0; i < LIMIT + 1; i++) {
            response = await agent.get('/')
        }
        const data: ApiResponse = response?.body;
        expect(data.code).to.be.equal('TOO_MANY_REQUEST');
    })
})