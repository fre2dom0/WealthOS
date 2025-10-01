import { createClient } from "redis"
import { RedisStore } from "connect-redis"
import ApiError from "../errors/ApiError.error.js"

// Initialize client.
let redisClient = createClient()
redisClient.connect().catch((err) => ApiError.fatalError(err));

// Initialize store.
export const redisStore = new RedisStore({
    client: redisClient,
    prefix: "WealthOS-Session:",
})