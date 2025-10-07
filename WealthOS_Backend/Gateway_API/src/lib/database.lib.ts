// lib/database.ts
import pgPromise from 'pg-promise';

class Database {
    private pgp;
    private db;
    constructor(config: any) {
        this.pgp = pgPromise();
        this.db = this.pgp(config);
    }

    public query(query: string, params?: any[]) {
        return this.db.any(query, params);
    }

    public one(query: string, params?: any[]) {
        return this.db.one(query, params);
    }
}

// Tek instance oluştur ve export et
export const db = new Database({});
