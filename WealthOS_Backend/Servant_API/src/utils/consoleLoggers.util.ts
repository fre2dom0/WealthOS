import { requireEnv } from "./requireEnv.util.js";
const node_env = requireEnv('NODE_ENV')
const is_test: boolean = Boolean(process.env.TEST);


type TypeOfLog = 'INFO' | 'WARNING' | 'WAITING' | 'SUCCESS' | 'DENIED';

const emojiMap: Record<TypeOfLog, string> = {
    INFO: '❓',
    WARNING: '⚠️',
    WAITING: '⏳',
    DENIED: '❌',
    SUCCESS: '✅',
};


/**
 * Logs a message if environment is development mode.
 * @param message Logged message
 */
export const devLog = (message: string, type?: TypeOfLog) => {
    if (node_env != 'development' || is_test) return;

    const emoji = type ? emojiMap[type] : '';
    console.log(`${emoji ? `${emoji} ` : ''}${message}`);
}

/**
 * Logs a message
 * @param message Logged message
 */
export const infoLog = (message: string, type?: TypeOfLog) => {
    if (is_test) return;

    const emoji = type ? emojiMap[type] : '';
    console.log(emoji ? `${emoji} ${message}` : message);
}

/**
 * Logs a error message
 * @param message Logged message
 */
export const errorLog = (message: string | unknown) => {
    if (is_test) return;
    console.error('❌' + ' ' + message);
}