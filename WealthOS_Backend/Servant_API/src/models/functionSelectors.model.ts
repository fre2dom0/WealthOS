import type { FunctionSelectorData } from "../../types/db/function-selectors.type.js";
import { db } from "../app.js";
import ApiError from "../errors/ApiError.error.js";
import { errorLog } from "../utils/consoleLoggers.util.js";

export default {
    getAll: async (): Promise<FunctionSelectorData[]> => {
        try {
            return await db.query('SELECT * FROM static.function_selectors ORDER BY contract_address, function;') as FunctionSelectorData[];
        } catch (err: unknown) {
            throw new ApiError(`An error occurred while fetching function selectors from database: ${err instanceof Error ? err.message : String(err)}`);
        }
    },
    getContractFunctionSelectors: async (contract_address: `0x${string}`): Promise<FunctionSelectorData[]> => {
        try {
            return await db.query('SELECT * FROM static.function_selectors WHERE contract_address = $1 ORDER BY function;', [contract_address]) as FunctionSelectorData[];
        } catch (err: unknown) {
            throw new ApiError(`An error occurred while fetching function contract function selectors from database: ${err instanceof Error ? err.message : String(err)}`);
        }
    },
    insertFunctionSelectors: async (data: FunctionSelectorData[]): Promise<boolean> => {
        try {
            const values: string = data.map((_, i) => `($${i * 4 + 1}, $${i * 4+ 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', '); // Create values
            const params = data.flatMap(d => [d.contract_address, d.function_selector, d.function, d.description]); // Order the parameters
            const query = `INSERT INTO static.function_selectors (contract_address, function_selector, function, description) VALUES ${values}`

            return await db.none(query, params);
        } catch (err: unknown) {
            throw new ApiError(`An error occurred while inserting function selectors to database: ${err instanceof Error ? err.message : String(err)}`, 'DATABASE_ERROR');
        }
    },
    deleteFunctionSelectors: async (functionSelectors: string[]): Promise<FunctionSelectorData[]> => {
        try {
            const values = functionSelectors.map((_, i) => `$${i + 1}`).join(', '); // Create values
            const query = `DELETE FROM static.function_selectors WHERE function_selector IN (${values}) RETURNING *;`;

            return await db.query(query, functionSelectors) as FunctionSelectorData[];
        } catch (err: unknown) {
            throw new ApiError(`An error occurred while deleting function selectors from database: ${err instanceof Error ? err.message : String(err)}`, 'DATABASE_ERROR');
        }
    },
    deleteContractFunctionSelectors: async (contractAddresses: `0x${string}`[]): Promise<FunctionSelectorData[]> => {
        try {
            const values = contractAddresses.map((_, i) => `$${i + 1}`).join(', '); // Create values
            const query = `DELETE FROM static.function_selectors WHERE contract_address IN (${values}) RETURNING *;`;

            return await db.query(query, contractAddresses) as FunctionSelectorData[];
        } catch (err: unknown) {
            throw new ApiError(`An error occurred while deleting contract function selectors from database: ${err instanceof Error ? err.message : String(err)}`, 'DATABASE_ERROR');
        }
    }
}