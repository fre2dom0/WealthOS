
import ApiError from "#src/errors/ApiError.error.js";
import type { ApiConfig, ChainEnv, DeployType, NodeEnv } from "#types/api.config.type.js";
import { requireEnv } from "#utils/requireEnv.util.js";
import chalk from "chalk";

const local_domain = 'localhost'

/**
 * Reads environment variables according to NAME key
 * @returns Read environment variables
 */
const getEnvironmentVariables = (): { chain_env: ChainEnv, node_env: NodeEnv, deploy_type: DeployType, domain: string, port: number, allowed_origins: string[]} => {
    const ENVIRONMENT_NAME = requireEnv('ENVIRONMENT');
    try {
        switch (ENVIRONMENT_NAME) {
            case 'LOCAL_DEVELOPMENT':
                const node_env = requireEnv('NODE_ENV');
                console.log(`⏳ Preparing API configurations...`)

                if (node_env != 'development' && node_env != 'stage' && node_env != 'production') throw new ApiError(`Invalid NODE_ENV: ${node_env}`);
                const isDev = node_env == 'development';

                const chain_env = requireEnv('CHAIN_ENV');
                if (isDev) console.log(`\t⛓️ ${chalk.bold(`CHAIN_ENV: ${chain_env}`)} `)
                if (chain_env != 'mainnet' && chain_env != 'testnet') throw new ApiError(`Invalid CHAIN_ENV: ${chain_env}`);

                const deploy_type = requireEnv('DEPLOY_TYPE');
                if (isDev) console.log(`\t🖥️ ${chalk.bold(`DEPLOY_TYPE: ${deploy_type}`)} `);
                if (deploy_type != 'local' && deploy_type != 'deployment') throw new ApiError(`Invalid DEPLOY_TYPE: ${deploy_type}`);

                let domain: string;
                if (deploy_type == 'local') domain = local_domain
                else domain = requireEnv('DOMAIN')
                if (isDev) console.log(`\t🌎 ${chalk.bold(`DOMAIN: ${domain}`)} `);

                const port = parseInt(requireEnv('PORT'));
                if (isDev) console.log(`\t⚓ ${chalk.bold(`PORT: ${port}`)} `);
                if (isNaN(port)) throw new ApiError(`Invalid PORT: ${port}`);
                
                const allowed_origins: string[] = [];
                const allowed_origins_variable: string = requireEnv('ALLOWED_ORIGINS')
                allowed_origins_variable.split(',').map(origin => {
                    allowed_origins.push(origin);
                })
                if (isDev) console.log(`\t🔐 ${chalk.bold(`ALLOWED_ORIGINS: ${allowed_origins}`)} `);

                console.log(`✅ API config is ready`)

                return {
                    chain_env,
                    node_env,
                    deploy_type,
                    domain,
                    port,
                    allowed_origins
                }
            default:
                throw new ApiError(`Unknown ENVIRONMENT_NAME: ${ENVIRONMENT_NAME}`, 'SERVER_ERROR', 500);
        }
    } catch (err: unknown) {
        ApiError.fatalError(err);
    }
}

const {chain_env, node_env, deploy_type, domain, port, allowed_origins} = getEnvironmentVariables();
const API_CONFIG: ApiConfig = {
    chain_env,
    node_env,
    deploy_type,
    domain,
    port,
    allowed_origins
}

export default API_CONFIG;