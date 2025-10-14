import { infoLog } from '../utils/consoleLoggers.util.js';
import type { Options } from 'express-rate-limit';

let count_of_rate_limiter: number = 0;

// Create and use the rate limiter
infoLog('Preparing rate limiter configurations...', 'WAITING');
export const RATE_LIMITER_CONFIG: Partial<Options> = {
	// Rate limiter configuration
	windowMs: 1 * 60 * 1000, // 1 minutes
	limit: 50,
	standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
	legacyHeaders: false, // Disable the `X-RateLimit-*` headers
	requestPropertyName: 'rate_limiter',
};

infoLog('Rate limiter config is ready.', 'SUCCESS');