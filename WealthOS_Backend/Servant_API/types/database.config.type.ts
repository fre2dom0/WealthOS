import type { Tables } from "../src/models/database.model.js"

export interface DatabaseConfig {
    port: number,
    host: string,
    database: string,
    user: string,
    password: string
}

export const EVENT_TO_EVENT_TABLE: Record<string, Tables> = {
    'Approved': 'approved',
    "Revoked": 'revoked',
    "Executed": 'executed'
}

