import './libs/loadEnv.lib.js';
import './configs/chain.config.js';

import createApp from "./libs/createApp.lib.js";
import API_CONFIG from "./configs/api.config.js";

const app = createApp();
const PORT = API_CONFIG.port;
export default {app, PORT};