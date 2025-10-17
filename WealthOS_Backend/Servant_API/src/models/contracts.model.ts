import { db } from "../app.js";
import { errorLog } from "../utils/consoleLoggers.util.js";

export default {
    getAll: async () => {
        try {
            return await db.query('SELECT * FROM static.contracts');
        } catch (err: unknown) {
            errorLog('[ERROR-[STATIC.CONTRACTS]-An error occurred while getting contracts')
            throw err;
        }
    },
    addContract: async () => {
        try {
            return await db.none('INSERT INTO static.contracts (address, name, description) VALUES ($1, $2, $3);', []);
        } catch (err: unknown) {
            errorLog('[ERROR-[STATIC.CONTRACTS]-An error occurred while adding contract')
            throw err;
        }
    },
    deleteContract: async () => {
        try {
            return await db.none('DELETE FROM static.contracts WHERE address = $1;');
        } catch (err: unknown) {
            errorLog('[ERROR-[STATIC.CONTRACTS]-An error occurred while deleting contract')
            throw err;
        }
    }
}