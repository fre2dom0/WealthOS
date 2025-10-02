import { RedisStore } from 'rate-limit-redis'
import ApiError from '../errors/ApiError.error.js';
import redisClient from './redis.config.js';
import { infoLog } from '../utils/consoleLoggers.util.js';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';



// Create and use the rate limiter
infoLog('⏳ Preparing rate limiter configurations...')
export const RATE_LIMITER_CONFIG = {
	// Rate limiter configuration
	windowMs: 5 * 60 * 1000, // 5 minutes
	limit: 25,
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	handler: () => {
		throw new ApiError('Spam detected. Please try again later.', 'TOO_MANY_REQUEST');
	},
	store: new RedisStore({
		sendCommand: (...args: string[]) => redisClient.sendCommand(args),
	}),
};

export const useRateLimit = (limit?: number, windowMs?: number): RateLimitRequestHandler => {
	if (limit) RATE_LIMITER_CONFIG['limit'] = limit;
	if (windowMs) RATE_LIMITER_CONFIG['windowMs'] = windowMs;
	
	return rateLimit(RATE_LIMITER_CONFIG);
}

infoLog('✅ Rate limiter config is ready.')

