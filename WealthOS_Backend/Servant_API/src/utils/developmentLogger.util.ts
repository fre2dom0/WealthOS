import API_CONFIG from "#src/configs/api.config.js";
import { requireEnv } from "./requireEnv.util.js";

export const devLog = (message: string) => {
    if (API_CONFIG.node_env == 'development') console.log(message);
}