import { requireEnv } from "./requireEnv.util.js";
const node_env = requireEnv('NODE_ENV')
const IS_TEST:boolean = Boolean(process.env.TEST); 

/**
 * Logs a message if environment is development mode.
 * @param message Logged message
 */
export const devLog = (message: string) => {
    if (node_env == 'development' && !IS_TEST) console.log(message);
}

/**
 * Logs a message if not test mode
 * @param message Logged message
 */
export const infoLog = (message: string) => {
    if (!IS_TEST) console.log(message);
}

/**
 * Logs a error message if not test mode
 * @param message Logged message
 */
export const errorLog = (message: string | unknown) => {
    if (!IS_TEST) console.error(message);
}