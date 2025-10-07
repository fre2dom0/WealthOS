
import type { ApiConfig, DeployType, NodeEnv } from "../../types/api.config.type.js"
import ApiError from "../errors/ApiError.error.js";
import { devLog, infoLog } from "../utils/consoleLoggers.util.js";
import { requireEnv } from "../utils/requireEnv.util.js";

const local_domain = 'localhost'

/**
 * Reads environment variables according to NAME key
 * @returns Read environment variables
 */
const getEnvironmentVariables = (): { node_env: NodeEnv, deploy_type: DeployType, domain: string, port: number, allowed_origins: string[] } => {
    const ENVIRONMENT_NAME = process.env.ENVIRONMENT;
    try {
        if (ENVIRONMENT_NAME === 'LOCAL_DEVELOPMENT') {
            const node_env = requireEnv('NODE_ENV');
            infoLog(`⏳ Preparing API configurations...`);

            if (node_env !== 'development' && node_env !== 'stage' && node_env !== 'production') {
                throw new ApiError(`Invalid NODE_ENV: ${node_env}`);
            }
            devLog(`\t💼 NODE_ENV: ${node_env}`);

            const deploy_type = requireEnv('DEPLOY_TYPE');
            devLog(`\t🖥️ DEPLOY_TYPE: ${deploy_type}`);
            if (deploy_type !== 'local' && deploy_type !== 'deployment') {
                throw new ApiError(`Invalid DEPLOY_TYPE: ${deploy_type}`);
            }

            let domain: string;
            if (deploy_type === 'local') {
                domain = local_domain;
            } else {
                domain = requireEnv('DOMAIN');
            }
            devLog(`\t🌎 DOMAIN: ${domain}`);

            const port = parseInt(requireEnv('PORT'));
            devLog(`\t⚓ PORT: ${port}`);
            if (isNaN(port)) {
                throw new ApiError(`Invalid PORT: ${port}`);
            }

            const allowed_origins: string[] = [];
            const allowed_origins_variable: string = requireEnv('ALLOWED_ORIGINS');
            allowed_origins_variable.split(',').forEach(origin => {
                allowed_origins.push(origin.trim());
            });
            devLog(`\t🔐 ALLOWED_ORIGINS: ${allowed_origins}`);

            infoLog(`✅ API config is ready`);

            return {
                node_env,
                deploy_type,
                domain,
                port,
                allowed_origins
            };
        } else {
            devLog(`⚠️ Unknown ENVIRONMENT_NAME: ${ENVIRONMENT_NAME} - Preparing default settings...`);
            return {
                node_env: 'development',
                deploy_type: 'local',
                domain: 'localhost',
                port: 5001,
                allowed_origins: ['localhost']
            };
        }
    } catch (err: unknown) {
        ApiError.fatalError(err);
    }
}
const { node_env, deploy_type, domain, port, allowed_origins } = getEnvironmentVariables();
const is_test: boolean = Boolean(process.env.TEST);
const API_CONFIG: ApiConfig = {
    is_test,
    node_env,
    deploy_type,
    domain,
    port,
    allowed_origins
}

export default API_CONFIG;