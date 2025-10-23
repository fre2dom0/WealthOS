import type { ContractData } from "../../types/db/contracts.type.js";
import { connectionString } from "../configs/database.config.js";
import { ApiError } from "../errors/ApiError.error.js";
import { Database } from "../libs/database.lib.js";

const db = Database.getInstance(connectionString);

export const CONTRACTS_QUERIES = {
    getAll: async (): Promise<ContractData[]> => {
        try {
            return await db.query('SELECT * FROM static.contracts ORDER BY name') as ContractData[];
        } catch (err: unknown) {
            throw new ApiError(`An error occurred while fetching contracts from database: ${err instanceof Error ? err.message : String(err)}`);
        }
    },
    insertContracts: async (data: ContractData[]): Promise<boolean> => {
        try {
            const values: string = data.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(', '); // Create values
            const params = data.flatMap(d => [d.address, d.name, d.description]); // Order the parameters
            const query = `INSERT INTO static.contracts (address, name, description) VALUES ${values}`

            return await db.none(query, params);
        } catch (err: unknown) {
            throw new ApiError(`An error occurred while inserting contracts to database: ${err instanceof Error ? err.message : String(err)}`, 'DATABASE_ERROR');
        }
    },
    deleteContracts: async (contractAddresses: `0x${string}`[]): Promise<ContractData[]> => {
        try {
            const values = contractAddresses.map((_, i) => `$${i + 1}`).join(', '); // Create values
            const query = `DELETE FROM static.contracts WHERE address IN (${values}) RETURNING *;`;

            return await db.query(query, contractAddresses) as ContractData[];
        } catch (err: unknown) {
            throw new ApiError(`An error occurred while deleting contracts from database: ${err instanceof Error ? err.message : String(err)}`, 'DATABASE_ERROR');
        }
    }
}