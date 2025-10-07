import type { Request, Response } from 'express';

import express, { type Express } from 'express';
import { errorHandler } from '../middlewares/errorHandler.middleware.js';

export const createApp = (): Express => {
    const app: Express = express();
    
    // Middlewares
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    
    app.get('/', (req: Request, res: Response) => {
        res.send(`Welcome to the WealthOS Gateway API.`);
    })
     
    // Middleware
    app.use(errorHandler);

    return app;
}