import './libs/loadEnv.lib.js';

import API_CONFIG from "./configs/api.config.js";
import { connectionString } from './configs/database.config.js';

import { Database } from './libs/database.lib.js';
import { watchServantEvents } from './libs/watchServantContractEvents.lib.js';

import createApp from "./libs/createApp.lib.js";


// TODO : 
/**
 * Open database to the api and test it.
 * Make servant address to execute calls.
 */

// Start database
export const db = Database.getInstance(connectionString);

// Start watching events
watchServantEvents();

// Start app
const app = createApp();
const PORT = API_CONFIG.port;

export default {app, PORT};