import type { ApiResponse } from '../types/response.type';
import { RATE_LIMITER_CONFIG } from '../src/configs/rate-limiter.config';

import { describe, beforeAll, it, expect } from 'vitest';
import request from 'supertest';
import createApp from '../src/libs/createApp.lib';

describe('Middleware - Rate Limiter', async () => {
    const endpoint = '/';
    const agent = request.agent(createApp({enableRateLimiter: true}));
    const LIMIT: number = RATE_LIMITER_CONFIG.limit as number;

    it(`Should throw error if exceeds the limit(${LIMIT})`, async () => {
        let response;
        for (let i = 0; i < LIMIT; i++) {
            response = await agent.get('/')
        }
        const data: ApiResponse = response?.body;
        expect(data.code).to.be.equal('TOO_MANY_REQUEST');
    })
})