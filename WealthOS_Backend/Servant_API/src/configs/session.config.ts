import { type SessionOptions } from 'express-session';
import API_CONFIG from './api.config.js';
import { devLog, infoLog } from '../utils/consoleLoggers.util.js';
import chalk from 'chalk';
import { redisStore } from './redis.config.js';

infoLog('⏳ Preparing session configurations...')
export const SESSION_CONFIG: SessionOptions = {
    secret: process.env.SESSION_SECRET || 'supersecret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: API_CONFIG.deploy_type == 'local' ? false : true,
        httpOnly: API_CONFIG.deploy_type == 'local' ? false : true,
        sameSite: 'lax',
        maxAge: 86400 * 1000,
    },
    rolling: true,
    store: redisStore
};

(Object.entries(SESSION_CONFIG)).forEach(([key, value]) => {
    devLog(`\t${chalk.bold(`${key}: ${JSON.stringify(value)}`)}`);
});

infoLog('✅ Session config is ready')



