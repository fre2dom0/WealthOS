import type { ApiResponse } from '../types/response.type.js';

import { describe, beforeEach, it, expect, vi } from 'vitest';
import request from 'supertest';
import createApp from '../src/libs/createApp.lib.js'
import { signMessage } from "viem/accounts";

import { SESSION_SIGNATURE, WALLET } from './config/test.config.js';
import TestAgent from 'supertest/lib/agent.js';
import redisClient from '../src/configs/redis.config.js';

const prefix: string = '/session';

describe('/session', () => {
	const agent = request.agent(createApp({ enableRateLimiter: false }));

	describe(`GET - ${prefix}/nonce`, () => {
		it('Should return nonce', async () => {
			const response = await agent.get(`${prefix}/nonce`)
			const data: ApiResponse = response.body;
			expect(data.message).toBe('Nonce successfully created!');
		})

	})

	describe(`POST - ${prefix}/create_session`, () => {
		let nonce: string;
		let signature: `0x${string}`;

		beforeEach(async () => {
			const keys = await redisClient.scanIterator({ MATCH: "test*" });

			for await (const key of keys) {
				await redisClient.del(key);
			}
			// Get nonce
			const nonce_response = await agent.get(`${prefix}/nonce`)
			nonce = nonce_response.body.data;

			// Sign message with nonce
			signature = await signMessage({ message: `${SESSION_SIGNATURE.message}${nonce}`, privateKey: WALLET.PRIVATE_KEY });
			expect(signature).not.toBeFalsy;
		})

		it('Should create session by signing message with nonce', async () => {
			// Create session by using signature and nonce
			const response = await agent.post(`${prefix}/create_session`)
				.send({
					address: WALLET.PUBLIC_KEY,
					signature,
					nonce
				})

			// Check creating session response
			const create_session_response_data: ApiResponse = response.body;
			expect(create_session_response_data.code).to.be.equal('SUCCESS');

			// Check session status
			const check_session_response = await agent.get(`${prefix}/check_session`)
			const check_session_response_data: ApiResponse = check_session_response.body;
			expect(check_session_response_data.data).to.be.true;
		})

		it('Should throw error if body data has any empty value', async () => {
			let response = await agent.post(`${prefix}/create_session`)
				.send({
					address: '',
					signature,
					nonce
				})

			let data: ApiResponse = response.body;
			expect(data.message).to.be.includes('address');
			expect(data.code).to.be.equal('BAD_REQUEST');

			response = await agent.post(`${prefix}/create_session`)
				.send({
					address: WALLET.PUBLIC_KEY,
					signature: '',
					nonce
				})

			data = response.body;
			expect(data.message).to.be.includes('signature');
			expect(data.code).to.be.equal('BAD_REQUEST');

			response = await agent.post(`${prefix}/create_session`)
				.send({
					address: WALLET.PUBLIC_KEY,
					signature,
					nonce: ''
				})

			data = response.body;
			expect(data.message).to.be.includes('nonce');
			expect(data.code).to.be.equal('BAD_REQUEST');
		})

		it('Should throw error if signature is not valid', async () => {
			// Mock invalid signature
			const response = await agent.post(`${prefix}/create_session`)
				.send({
					address: WALLET.PUBLIC_KEY,
					signature: '0x2e17283d2bf3c8e90aa5aacf43871811731ae44bf1ee9023a13a929227985de705b97d09dfb7b9db6a9655c2e06daf702410b694e605380468bbc2c0d646108e1c',
					nonce
				})

			const data: ApiResponse = response.body;
			expect(data.code).to.be.equal('UNAUTHORIZED');
			expect(data.message).to.be.equal('Invalid signature. Please ensure the message and signature are correct.')
		})

		it('Should throw error if nonce mismatches', async () => {
			const response = await agent.post(`${prefix}/create_session`)
				.send({
					address: WALLET.PUBLIC_KEY,
					signature,
					nonce: '0000000'
				})

			const data: ApiResponse = response.body;
			expect(data.code).to.be.equal('UNAUTHORIZED');
			expect(data.message).to.be.equal('Nonce mismatches while verifying signature.')
		})

		it('Should throw error if nonce expired', async () => {
			const now = Date.now();
			const fiveMinutesLater = now + 5 * 60 * 1000;
			vi.setSystemTime(fiveMinutesLater);

			const response = await agent.post(`${prefix}/create_session`)
				.send({
					address: WALLET.PUBLIC_KEY,
					signature,
					nonce
				})

			const data: ApiResponse = response.body;
			expect(data.code).to.be.equal('UNAUTHORIZED');
			expect(data.message).to.be.equal('Nonce expired.')
		})

	})



})

describe('Rate Limiter', () => {
	let agent: InstanceType<typeof TestAgent>;

	beforeEach(async () => {
		const keys = await redisClient.scanIterator({ MATCH: "test*" });
		for await (const key of keys) {
			await redisClient.del(key);
		}

		agent = request.agent(createApp({ enableRateLimiter: true }));
	})

	it(`Should ${prefix}/nonce return 429 after 5 request in 15 minutes`, async () => {
		const LIMIT: number = 5;

		let response;
		for (let i = 0; i < LIMIT + 1; i++) {
			response = await agent.get(`${prefix}/nonce`)
		}

		const status_code: number = response?.statusCode!;
		expect(status_code).to.be.equal(429);

	})

	it(`Should ${prefix}/create_session return 429 after 5 request in 15 minutes`, async () => {
		const LIMIT: number = 5;

		let response;
		for (let i = 0; i < LIMIT + 1; i++) {
			// GEt nonce
			const nonce_response = await agent.get(`${prefix}/nonce`)
			const nonce = nonce_response.body.data;
			expect(nonce).not.toBeFalsy;

			// Sign message with nonce
			const signature = await signMessage({ message: `${SESSION_SIGNATURE.message}${nonce}`, privateKey: WALLET.PRIVATE_KEY });
			expect(signature).not.toBeFalsy;

			response = await agent.post(`${prefix}/create_session`)
				.send({
					address: WALLET.PUBLIC_KEY,
					signature: '0x',
					nonce: '0x',
				})
		}

		const status_code: number = response?.statusCode!;
		expect(status_code).to.be.equal(429);
	})

	it(`Should ${prefix}/check_session return 429 after 50 request in 1 minutes`, async () => {
		const LIMIT: number = 50;

		let response;

		for (let i = 0; i < LIMIT + 1; i++) {
			response = await agent.get(`${prefix}/check_session`);;
		}

		const status_code: number = response?.statusCode!;
		expect(status_code).to.be.equal(429);
	})

	it(`Should ${prefix}/fetch_session return 429 after 50 request in 1 minutes`, async () => {
		const LIMIT: number = 50;

		let response;

		for (let i = 0; i < LIMIT + 1; i++) {
			response = await agent.get(`${prefix}/fetch_session`);;
		}

		const status_code: number = response?.statusCode!;
		expect(status_code).to.be.equal(429);
	})

})