
import './libs/loadEnv.lib.js';
import './configs/api.config.js';
import './configs/chain.config.js';
import './configs/database.config.js';

import API_CONFIG from "./configs/api.config.js";

import { connectionString } from './configs/database.config.js';

import createApp from "./libs/createApp.lib.js";

import { Database } from './libs/database.lib.js';
import { watchServantEvents } from './libs/watchServantContractEvents.lib.js';

// TODO : 
/**
 * Prepare test for event listening
 * Prepare test for spam protection
 * Open database data to api.
 * Make servant address to execute calls.
 */

// Start database
Database.getInstance(connectionString);

// Start watching events
watchServantEvents();

// Start app
const app = createApp();
const PORT = API_CONFIG.port;
export default {app, PORT};