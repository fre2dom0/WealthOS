import { type SessionOptions } from 'express-session';
import { API_CONFIG } from './api.config.js';
import { redisClient } from './redis.config.js';
import { RedisStore } from 'connect-redis';
import { devLog, infoLog } from '../utils/consoleLoggers.util.js';

import chalk from 'chalk';

infoLog('Preparing session configurations...', 'WAITING');


const prefix: string = API_CONFIG.is_test ? 'test-wealthos-session:' : 'wealthos-session';

// Initialize store.
const redisStore = new RedisStore({
    client: redisClient,
    prefix
})

export const SESSION_CONFIG: SessionOptions = {
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: true,
    saveUninitialized: true, // ! Does not work with rate limiter if it is false.
    cookie: {
        secure: API_CONFIG.deploy_type == 'local' ? false : true,
        httpOnly: API_CONFIG.deploy_type == 'local' ? false : true,
        sameSite: 'lax',
        maxAge: 86400 * 1000,
    },
    rolling: true,
    store: redisStore,
};

(Object.entries(SESSION_CONFIG)).forEach(([key, value]) => {
    devLog(`\t${chalk.bold(`- ${key}: ${JSON.stringify(value)}`)}`);
});

infoLog('Session configuration is ready.', 'SUCCESS');

