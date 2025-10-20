import type { ApiResponseCode } from "./response.type.js";

export const CODE_TO_STATUS: Record<ApiResponseCode, number> = {
  SUCCESS: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NO_SESSION: 401,
  DATABASE_ERROR: 409,
  SESSION_FOUND: 409,
  TOO_MANY_REQUEST: 429,
  SERVER_ERROR: 500,
};
