export interface DatabaseConfig {
    port: number,
    host: string,
    database: string,
    user: string,
    password: string
}

export const EVENT_TO_EVENT_TABLE: Record<string, string> = {
    'Approved': 'approved',
    "Revoked": 'revoked',
    "Executed": 'executed'
}

