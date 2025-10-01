import crypto from "crypto";

/**
 * Creates random string
 * @param length Length of string
 * @returns Random string
 */
export const createRandomString = (length: number): string => {
    return crypto.randomBytes(Math.ceil(length / 2))
    .toString("base64url")
    .slice(0, length);
}