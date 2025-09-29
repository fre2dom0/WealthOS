import express, {type Express} from 'express';

//test
const app: Express = express();
export const PORT = process.env.PORT ?? "2000";

export default app;