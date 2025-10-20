
import './libs/loadEnv.lib.js';
import './configs/api.config.js';
import './configs/chain.config.js';
import './configs/database.config.js';
import model from './models/contracts.model.js'

import API_CONFIG from "./configs/api.config.js";

import { connectionString } from './configs/database.config.js';

import createApp from "./libs/createApp.lib.js";

import { Database } from './libs/database.lib.js';
import { watchServantEvents } from './libs/watchServantContractEvents.lib.js';

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
const app = createApp({enableSession: false, enableRateLimiter: false});
const PORT = API_CONFIG.port;

export default {app, PORT};