import crypto from "crypto";

export const createRandomString = (length: number): string => {
    return crypto.randomBytes(Math.ceil(length / 2))
    .toString("base64url")
    .slice(0, length);
}