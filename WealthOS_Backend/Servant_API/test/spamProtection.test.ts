import { describe, beforeAll, it, expect } from 'vitest';
import request from 'supertest';
import createApp from '../src/libs/createApp.lib';

describe('Spam Protection', () => {
    const agent = request.agent(createApp({ enableRateLimiter: true }));
    const LIMIT: number = 1000;

    it(`Should throw error if exceeds ${LIMIT} request at 60 seconds`, async () => {
        let response;
        let status_code: number
        
        for (let i = 0; i < LIMIT * 2; i++) {
            response = await agent.get(`/`)
            status_code = response?.statusCode!;

            console.log(status_code, i)
        }
        
        status_code = response?.statusCode!;
        expect(status_code).to.be.equal(429);
    })
})