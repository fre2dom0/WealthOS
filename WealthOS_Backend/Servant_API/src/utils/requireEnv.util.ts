import ApiError from "#errors/ApiError.error.js";

/**
 * Ensures a required environment variable is present and non-empty.
 * Throws an ApiError if the variable is missing or empty.
 * 
 * @param key - The name of the environment variable.
 * @returns The value of the environment variable as a non-empty string.
 * @throws {ApiError} If the environment variable is not set or is empty.
 */
export const requireEnv = (key: string): string => {
	const value = process.env[key];
	if (value == undefined || value == '') throw new ApiError(`Environment variable '${key}' is required but not set.`, 'SERVER_ERROR', 500);
	return value;
};