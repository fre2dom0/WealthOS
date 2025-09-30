import { requireEnv } from "./requireEnv.util.js";

export const devLog = (message: string) => {
    const node_env = requireEnv('NODE_ENV');
    if (node_env == 'development') console.log(message);
}