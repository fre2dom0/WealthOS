import { requireEnv } from "./requireEnv.util.js";
const node_env = requireEnv('NODE_ENV')

/**
 * Logs a message if environment is development mode.
 * @param message Logged message
 */
export const devLog = (message: string) => {
    if (node_env == 'development') console.log(message);
}

/**
 * Logs a message
 * @param message Logged message
 */
export const infoLog = (message: string) => {
    console.log(message);
}

/**
 * Logs a error message
 * @param message Logged message
 */
export const errorLog = (message: string | unknown) => {
    console.error(message);
}