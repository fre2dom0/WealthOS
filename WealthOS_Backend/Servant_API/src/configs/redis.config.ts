import { createClient } from "redis"
import ApiError from "../errors/ApiError.error.js"
import { infoLog } from "../utils/consoleLoggers.util.js"

// Initialize client.
infoLog('Initializing redis...', 'WAITING');
const redisClient = createClient();
redisClient.connect().catch((err) => ApiError.fatalError(err));
infoLog('Redis initialized.', 'SUCCESS');

export default redisClient;

