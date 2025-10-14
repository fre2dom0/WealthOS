import type { Request } from 'express';
import { devLog } from '../utils/consoleLoggers.util.js';

import rateLimit, { ipKeyGenerator, type Options, type RateLimitRequestHandler } from 'express-rate-limit';

import redisClient from '../configs/redis.config.js';
import API_CONFIG from "../configs/api.config.js";
import { RATE_LIMITER_CONFIG } from "../configs/rate-limiter.config.js";
import RedisStore from 'rate-limit-redis';
import ApiError from '../errors/ApiError.error.js';

let count_of_rate_limiter: number = 0;

export type UseRateLimitParameters = {
	limit?: number;
	windowS?: number;
	errorMessage?: string;
	prefix?: string;
}

/**
 * Creates rate limit handler
 * @param {limit} How much request
 * @param {windowMs} How long request will be remembered
 * @returns {RateLimitRequestHandler} Request handler
 */
export const useRateLimit = (args: UseRateLimitParameters = {}): RateLimitRequestHandler => {

	console.log(args.prefix)
	const prefix = API_CONFIG.is_test
	? `test-wealthos-rate-limiter-${args.prefix ?? `${count_of_rate_limiter}`}:`
	: `wealthos-rate-limiter-${args.prefix ?? `${count_of_rate_limiter}`}:`;
	
	console.log(prefix);
	if (!args.prefix) count_of_rate_limiter++;

	devLog(`Preparing rate-limiter configuration ${prefix} :`, 'WAITING')
	const NEW_RATE_LIMITER_CONFIG: Partial<Options> = Object.assign({}, RATE_LIMITER_CONFIG, {
		limit: args.limit ?? RATE_LIMITER_CONFIG.limit,
		windowMs: args.windowS ? args.windowS * 1000 : RATE_LIMITER_CONFIG.windowMs,
		store: new RedisStore({
			sendCommand: (...args: string[]) => redisClient.sendCommand(args),
			prefix
		}),
		handler: () => {
			throw new ApiError(args.errorMessage ?? 'Spam detected. Please try again later.', 'TOO_MANY_REQUEST');
		},
		keyGenerator: (req: Request) => {
			// ! Does not work with req.ip
			return req.session ? req.session.id : ipKeyGenerator(req.ip!) // better
		}
	});

	devLog(`Rate-Limiter configuration is ready - ${prefix} :`, 'SUCCESS')
	Object.entries(NEW_RATE_LIMITER_CONFIG).forEach(([key, value]) => {
		devLog(`\t- ${key}: ${value}`)
	})

	return rateLimit(NEW_RATE_LIMITER_CONFIG);
}

export const mainRateLimit = useRateLimit({ limit: 1000, windowS: 60, prefix: 'main-rate-limit' });