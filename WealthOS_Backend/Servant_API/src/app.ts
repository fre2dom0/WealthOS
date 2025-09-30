import type { Request, Response } from 'express';
import express, {type Express} from 'express';
import './configs/env.config.js'
import API_CONFIG from './configs/api.config.js';
import { errorHandler } from './middlewares/errorHandler.middleware.js';
import { spinnerCloser } from './middlewares/spinnerCloser.middleware.js';

const app: Express = express();

// Middlewares
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(spinnerCloser);

app.get('/', (req: Request, res: Response) => {
    res.send(`Welcome to the WealthOS Servant Module API.`);
})

app.use(errorHandler);

export const PORT = API_CONFIG.port;
export default app;