import type { ApiResponse } from '../types/response.type.js';

import { describe, beforeEach, it, expect, vi } from 'vitest';
import request from 'supertest';
import app, { createServantApp } from '../src/app.js';
import { signMessage } from "viem/accounts";

import {SESSION_SIGNATURE, WALLET} from './config/test.config.js';
import { zeroAddress } from 'viem';
import { SESSION_ROUTER_CONFIG } from '../src/routers/session.router.js';

describe('/session', async () => {
	const prefix: string = '/session';
	const agent = request.agent(createServantApp({enableRateLimiter: false}));

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
			// Get nonce
			const nonce_response = await agent.get(`${prefix}/nonce`)
			nonce = nonce_response.body.data;
			
			// Sign message with nonce
			signature = await signMessage({message: `${SESSION_SIGNATURE.message}${nonce}`, privateKey: WALLET.PRIVATE_KEY});
			expect(signature).to.be.not.toBeFalsy;
		})

		it('Should sign message with nonce', async () => {
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

		it('Should throw error ')
	})

	describe('RATE LIMIT TEST', async () => {

		const agent = request.agent(createServantApp({enableRateLimiter: true}));
		
		it(`GET - /nonce - Should throw error if exceeds limit(${SESSION_ROUTER_CONFIG.limit})`, async () => {
			let response;
			// for (let i = 0; i < SESSION_ROUTER_CONFIG.limit; i++) {
			// 	console.log(i)
			// }
			response = await agent.get(`${prefix}/nonce`)
			const data: ApiResponse = response?.body;
			expect(data.code).to.be.equal('TOO_MANY_REQUEST');
		})
	})
})