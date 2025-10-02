import { requireEnv } from "./requireEnv.util.js";

/**
 * Logs a message if environment is development mode.
 * @param message Logged message
 */
export const devLog = (message: string) => {
    const node_env = requireEnv('NODE_ENV')
	const IS_TEST:boolean = Boolean(process.env.TEST); 
    if (node_env == 'development' && !IS_TEST) console.log(message);
}

/**
 * Logs a message if not test mode
 * @param message Logged message
 */
export const infoLog = (message: string) => {
	const IS_TEST:boolean = Boolean(process.env.TEST); 
    if (!IS_TEST) console.log(message);
}

/**
 * Logs a error message if not test mode
 * @param message Logged message
 */
export const errorLog = (message: string | unknown) => {
	const IS_TEST:boolean = Boolean(process.env.TEST); 
    if (!IS_TEST) console.error(message);
}