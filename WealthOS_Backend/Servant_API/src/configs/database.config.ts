import ApiError from "../errors/ApiError.error.js";
import { devLog, infoLog } from "../utils/consoleLoggers.util.js";
import { requireEnv } from "../utils/requireEnv.util.js";
import API_CONFIG from "./api.config.js";
import type { DatabaseConfig } from "../../types/database.config.type.js";

const local_host = 'localhost'

const getEnvironmentVariables = (): DatabaseConfig => {
    try {
        infoLog(`Preparing database configurations...`, 'WAITING');

        let host: string;
        if (API_CONFIG.deploy_type === 'local') host = local_host;
        else host = requireEnv('DATABASE_HOST');
        devLog(`\t🌎 DATABASE_HOST: ${host}`);

        const port: number = parseInt(requireEnv('DATABASE_PORT'));
        if (isNaN(port)) throw new ApiError(`Invalid DATABASE_PORT: ${port}`)
        devLog(`\t⚓ PORT: ${port}`);

        const database: string = requireEnv('DATABASE');
        devLog(`\t🗃️ DATABASE: ${database}`);

        const user: string = requireEnv('DATABASE_USER');
        devLog(`\t👤 DATABASE_USER: ${user}`);

        const password: string = requireEnv('DATABASE_PASSWORD');
        devLog(`\t🔒 DATABASE_PASSWORD: ${password[0] + '*'.repeat(password.length - 1)}`);

        infoLog(`Database configuration is ready`, 'SUCCESS');

        return {
            host,
            port,
            database,
            user,
            password
        }
    } catch (err: unknown) {
        ApiError.fatalError(err);
    }
}

const { host, port, database, user, password }: DatabaseConfig = getEnvironmentVariables();
export const connectionString = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;

const DATABASE_CONFIG: DatabaseConfig = {
    host,
    port,
    database,
    user,
    password
}

export default DATABASE_CONFIG;