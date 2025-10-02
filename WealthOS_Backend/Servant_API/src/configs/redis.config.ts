import { createClient } from "redis"
import { RedisStore } from "connect-redis"
import ApiError from "../errors/ApiError.error.js"
import { infoLog } from "../utils/consoleLoggers.util.js"

// Initialize client.
infoLog('⏳ Initializing redis...')
let redisClient = createClient()
redisClient.connect().catch((err) => ApiError.fatalError(err));

// Initialize store.
export const redisStore = new RedisStore({
    client: redisClient,
    prefix: "WealthOS-Session:",
})
infoLog('✅ Redis initialized.')

