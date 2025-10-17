import type { IDatabase, IMain, IInitOptions, ITask } from 'pg-promise';
import pgPromise from 'pg-promise';
import { devLog, errorLog, infoLog } from '../utils/consoleLoggers.util.js';

export class Database {
    private static instance: Database;
    private pgp: IMain;
    private db: IDatabase<{}>;
    private isShuttingDown = false;

    private constructor(connectionString: string) {
        const initOptions: IInitOptions = {
            // Triggered when a new database connection is established
            connect(e) {
                devLog('A connection occurred to database.', 'INFO');
            },
            // Triggered when a connection is disconnected
            disconnect(e) {
                devLog(`A disconnection occurred from database.`, 'INFO');
            },
            // Logs all executed queries
            query(e) {
                devLog(`New query: ${e.query}`, 'INFO');
            },
            // Handles errors globally
            error(err: unknown, e) {
                errorLog(`${err} - ${e.query}`);
            },
        };

        this.pgp = pgPromise(initOptions);
        this.db = this.pgp({
            connectionString,
        });

        // Set up shutdown hooks for graceful exit
        this.setupShutdownHooks();
    }

    // Singleton pattern: ensures a single instance
    public static getInstance(connectionString: string): Database {
        if (!Database.instance) {
            Database.instance = new Database(connectionString);
        }
        return Database.instance;
    }

    // Health check to verify database connectivity
    public async testConnection(): Promise<boolean> {
        try {
            await this.db.connect();
            devLog('Database connection is successful', 'INFO');
            return true;
        } catch (err) {
            errorLog('Database connection failed.');
            return false;
        }
    }

    // Execute a query that returns multiple rows
    public async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
        try {
            return await this.db.many(sql, params);
        } catch (err) {
            errorLog(`Query failed: ${sql} - Error: ${err}`);
            return [];
        }
    }

    // Execute a query that returns a single row
    public async one<T = any>(sql: string, params?: any[]): Promise<null> {
         try {
            return await this.db.one(sql, params);
        } catch (err) {
            errorLog(`One query failed or returned no result: ${sql} - Error: ${err}`);
            return null;
        }
    }

    // Execute a query that returns nothing
    public async none(sql: string, params?: any[]): Promise<void | boolean> {
        try {
            await this.db.none(sql, params);
            return true;
        } catch (err) {
            errorLog(`None query failed: ${sql} - Error: ${err}`);
            return false;
        }
    }

    // Execute a transactional block
    public async transaction<T>(callback: (t: ITask<{}>) => Promise<T>): Promise<T | null> {
        try {
            return await this.db.tx(callback);
        } catch (err) {
            errorLog(`Transaction failed - Error: ${err}`);
            return null;
        }
    }

    // Close the database connection gracefully
    public async close(): Promise<void> {
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;

        try {
            await this.pgp.end();
            infoLog('Database connection closed gracefully.', 'INFO');
        } catch (err) {
            errorLog(`Error closing database: ${String(err)}`);
        }
    }

    // Setup process signal listeners for graceful shutdown
    private setupShutdownHooks() {
        const shutdown = async (signal: string) => {
            if (this.isShuttingDown) return;
            infoLog(`Received ${signal}, closing database...`, 'WARNING');
            await this.close();
            process.exit(0);
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('exit', () => {
            if (!this.isShuttingDown) {
                this.close();
            }
        });
    }
}