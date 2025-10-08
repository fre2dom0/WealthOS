// config/env.ts

import dotenv, { type DotenvConfigOutput } from 'dotenv';
import path from 'path';
import fs from 'fs';
import ApiError from '../errors/ApiError.error.js';
import { requireEnv } from '../utils/requireEnv.util.js';
import { infoLog } from '../utils/consoleLoggers.util.js';

try {
	const FILE_PATH: string = process.cwd();

	infoLog(`\nLoading environments...`, 'WAITING');
	// 1. Load base .env file with safe typing
	const baseResult: DotenvConfigOutput = dotenv.config({ quiet: true });
	if (baseResult.error instanceof Error) {
		throw new Error(`Failed to load base .env: ${baseResult.error.message}`);
	}

	// 2. Determine environment context safely
	const deployType: string = requireEnv('DEPLOY_TYPE');
	const nodeEnv: string = requireEnv('NODE_ENV');

	// 3. Construct custom env filename
	let envFileSuffix: string = `.env.${deployType.toLowerCase()}.${nodeEnv.toLowerCase()}`;
	let customEnvPath: string = path.resolve(FILE_PATH, `${envFileSuffix}`);

	// 4. Load custom env if exists
	if (fs.existsSync(customEnvPath)) {
		const overrideResult = dotenv.config({ path: customEnvPath, override: true, quiet: true });
		if (overrideResult.error) {
			throw new ApiError(`Failed to load ${envFileSuffix} file: ${overrideResult.error.message}`);
		}

		infoLog(`Environment loaded - ENV File: ${envFileSuffix}`, 'SUCCESS');
	} else {
		infoLog(`Custom env file not found: ${customEnvPath}`, 'WARNING');
	}

	// 5. Load env.chain
	envFileSuffix = `.env.chain`
	customEnvPath = path.resolve(FILE_PATH, envFileSuffix);
	if (fs.existsSync(customEnvPath)) {
		const result = dotenv.config({ path: customEnvPath, quiet: true });

		if (result.error) {
			throw new ApiError(`Failed to load ${envFileSuffix} env file: ${result.error.message}`);
		}

		infoLog(`Environment loaded - ENV File: ${envFileSuffix}`, 'SUCCESS');
	} else {
		throw new ApiError(`Failed to load custom env file: ${envFileSuffix}`);
	}

	// 6. Load env.database
	envFileSuffix = `.env.database`
	customEnvPath = path.resolve(FILE_PATH, envFileSuffix);
	if (fs.existsSync(customEnvPath)) {
		const result = dotenv.config({ path: customEnvPath, quiet: true });

		if (result.error) {
			throw new ApiError(`Failed to load ${envFileSuffix} file: ${result.error.message}`);
		}

		infoLog(`Environment loaded - ENV File: ${envFileSuffix}`, 'SUCCESS');
	} else {
		throw new ApiError(`Failed to load custom env file: ${envFileSuffix}`);
	}

} catch (err: unknown) {
	ApiError.fatalError(err);
}