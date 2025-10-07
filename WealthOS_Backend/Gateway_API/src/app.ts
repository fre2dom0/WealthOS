
import './lib/loadEnv.lib.js';
import API_CONFIG from './configs/api.config.js';
import { createApp } from './lib/createApp.lib.js';


const app = createApp();
const PORT = API_CONFIG.port

export default {
    app,
    PORT
}