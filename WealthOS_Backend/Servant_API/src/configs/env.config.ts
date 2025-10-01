// config/env.ts

import dotenv, { type DotenvConfigOutput } from 'dotenv';
import path from 'path';
import fs from 'fs';
import ApiError from '#errors/ApiError.error.js';
import { requireEnv } from '#utils/requireEnv.util.js';

try {
	console.log(`\n⏳ Loading environment...`);

	// 1. Load base .env file with safe typing
	const baseResult: DotenvConfigOutput = dotenv.config({quiet: true});
	if (baseResult.error instanceof Error) {
		throw new Error(`Failed to load base .env: ${baseResult.error.message}`);
	}

	// 2. Determine environment context safely
	const deployType = requireEnv('DEPLOY_TYPE');
	const nodeEnv = requireEnv('NODE_ENV');

	// 3. Construct custom env filename
	const envFileSuffix = `${deployType.toLowerCase()}.${nodeEnv.toLowerCase()}`;
	const customEnvPath = path.resolve(process.cwd(), `.env.${envFileSuffix}`);

	// 4. Load custom env if exists
	if (fs.existsSync(customEnvPath)) {
		const overrideResult = dotenv.config({ path: customEnvPath, override: true, quiet: true });
		if (overrideResult.error) {
			throw new ApiError(`Failed to load custom env file: ${overrideResult.error.message}`);
		}
		
		console.log(`✅ Environment loaded - ENV File: env.${envFileSuffix}`);
	} else {
		console.warn(`⚠️ Custom env file not found: ${customEnvPath}`);
	}

} catch (err: unknown) {
	ApiError.fatalError(err);
}