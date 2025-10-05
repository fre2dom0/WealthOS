import { RedisStore } from 'rate-limit-redis'
import ApiError from '../errors/ApiError.error.js';
import redisClient from './redis.config.js';
import { devLog, infoLog } from '../utils/consoleLoggers.util.js';
import rateLimit, { type Options, type RateLimitRequestHandler } from 'express-rate-limit';
import API_CONFIG from './api.config.js';

let count_of_rate_limiter: number = 0;

// Create and use the rate limiter
infoLog('⏳ Preparing rate limiter configurations...')
export const RATE_LIMITER_CONFIG: Partial<Options> = {
	// Rate limiter configuration
	windowMs: 1 * 60 * 1000, // 1 minutes
	limit: 50,
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	handler: () => {
		throw new ApiError('Spam detected. Please try again later.', 'TOO_MANY_REQUEST');
	},
	store: new RedisStore({
		sendCommand: (...args: string[]) => redisClient.sendCommand(args),
		prefix: 'WealthOS-Rate-Limiter'
	}),
};

/**
 * Creates rate limit handler
 * @param limit How much request
 * @param windowMs How long request will be remembered
 * @returns Request handler
 */
export const useRateLimit = (limit?: number, windowMs?: number): RateLimitRequestHandler => {
	const prefix:string = API_CONFIG.is_test ? `Test-WealthOS-Rate-Limiter-${count_of_rate_limiter}` : `WealthOS-Rate-Limiter-${count_of_rate_limiter}`; 
	devLog(`⏳ Preparing rate-limiter configuration ${prefix} :`)
	
	const NEW_RATE_LIMITER_CONFIG: Partial<Options> = Object.assign({}, RATE_LIMITER_CONFIG, {
		limit: limit ?? RATE_LIMITER_CONFIG.limit,
		windowMs: windowMs ?? RATE_LIMITER_CONFIG.windowMs,
		store: new RedisStore({
			sendCommand: (...args: string[]) => redisClient.sendCommand(args),
			prefix
		}),
	});

	devLog(`✅ Rate-Limiter configuration is ready - ${prefix} :`)
	Object.entries(NEW_RATE_LIMITER_CONFIG).forEach(([key, value]) => {
		devLog(`\t- ${key}: ${value}`)
	})

	count_of_rate_limiter++;
	return rateLimit(NEW_RATE_LIMITER_CONFIG);
}

const mainRateLimit = useRateLimit();
infoLog('✅ Rate limiter config is ready.')

export default mainRateLimit;
