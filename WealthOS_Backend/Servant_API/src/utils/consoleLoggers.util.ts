import API_CONFIG from "#configs/api.config.js";
import { requireEnv } from "./requireEnv.util.js";

/**
 * Logs a message if environment is development mode.
 * @param message Logged message
 */
export const devLog = (message: string) => {
    if (API_CONFIG.node_env == 'development') console.log(message);
}