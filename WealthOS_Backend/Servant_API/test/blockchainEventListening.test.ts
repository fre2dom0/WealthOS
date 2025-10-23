import '../src/libs/loadEnv.lib.js';

import { decodeEventLog, type Log } from "viem";
import type { EventData } from "../types/db/events.type.js";
import servant_abi  from '../src/configs/jsons/servant_artifact.json';

import { describe, it, beforeAll, expect } from 'vitest';
import { processServantEvents } from '../src/libs/watchServantContractEvents.lib.js';

import pgPromise from "pg-promise";
import { randomBytes } from "crypto";
import { ApprovedEvent } from "../types/blockchain.type.js";
import { connectionString, DATABASE_CONFIG } from '../src/configs/database.config.js';


const generateHex66 = (): `0x${string}` => '0x' + randomBytes(32).toString('hex') as `0x${string}`;

// Mock data APPROVED :
const mockApprovedEvent: Log<bigint, number, false, undefined, undefined, undefined, undefined>[] = [{
    address: '0x10806f1f9019f3ba43e7811322324d819eda0e05',
    topics: [
        '0xc568646d3a48db8c47751060bab54410d8dbcb05aadce0085c670fba080eb8b1',
        '0x000000000000000000000000b60706f3b1c3ca291f49be4a840314a92eebb12d'
    ],
    data: '0x00000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000e1000000000000000000000000000000000000000000000000000000000000000010255dc5e00000000000000000000000000000000000000000000000000000000',
    blockHash: '0x60376c0a40bdbfa1966d4779ae9f2e4b6b2a64fddc4e97bbf356c9d9c2d817f0',
    blockNumber: 9425813n,
    transactionHash: '0xd732c60aa6a62fea64d103fe37c3f160929c0ac69599fe0ee9017ed1dea9e32c',
    transactionIndex: 35,
    logIndex: 53,
    removed: false
}]

// Mock data REVOKED :
const mockRevokedEvent: Log<bigint, number, false, undefined, undefined, undefined, undefined>[] = [{
    address: '0x10806f1f9019f3ba43e7811322324d819eda0e05',
    topics: [
        '0xdec09208725703c443c64e3dbbabfd335046e9da49a4059eb4e976ed467d9fca',
        '0x000000000000000000000000b60706f3b1c3ca291f49be4a840314a92eebb12d'
    ],
    data: '0x0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010255dc5e00000000000000000000000000000000000000000000000000000000',
    blockHash: '0xbfc719051d8c06d68a36d219066138f696ee9a4479f863ab3bcb82cedc44dad0',
    blockNumber: 9425815n,
    transactionHash: '0xe3abf7bd2597f914fc5304866ca3e2981665bf7b40429429afddc9811e208100',
    transactionIndex: 6,
    logIndex: 6,
    removed: false
}]

// Mock data EXECUTED : 
const mockExecutedEvent: Log<bigint, number, false, undefined, undefined, undefined, undefined>[] = [{
    address: '0x10806f1f9019f3ba43e7811322324d819eda0e05',
    topics: [
        '0xbd0123ee3a8dad3bc2777bd706a3d4b7b89a6f4f7d175b1e00e36558e94d83ab',
        '0x000000000000000000000000b60706f3b1c3ca291f49be4a840314a92eebb12d',
        '0x00000000000000000000000047a5a88b48c1924a7cff71a87b47f608530b3e34'
    ],
    data: '0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000a40255dc5e000000000000000000000000b60706f3b1c3ca291f49be4a840314a92eebb12d0000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000010000000000000000000000001c7d4b196cb0c7b01d743fbc6116a902379c723800000000000000000000000000000000000000000000000000000000',
    blockHash: '0x7dffcd76b63d713e241fcc3c0fdae168b887da92517de4dfae40455e8d9df816',
    blockNumber: 9426256n,
    transactionHash: '0x2ac29ea5554674aa8ffff8d2f4c8c84040bab8023cdbb549ae0aef23a02d052d',
    transactionIndex: 6,
    logIndex: 3,
    removed: false
}]

describe('Event Listening Test', () => {
    const pgp = pgPromise();
    const adminDb = pgp({
        host: DATABASE_CONFIG.host,
        port: DATABASE_CONFIG.port,
        user: DATABASE_CONFIG.user,
        password: DATABASE_CONFIG.password,
        database: "postgres",
    });

    let db: pgPromise.IDatabase<{}, any>;

    const sourceDb = "WealthOS_Servant_Module";
    const targetDb = "WealthOS_Servant_Module_Test";

    beforeAll(async () => {
        console.log("🔌 Connecting to PostgreSQL server...");

        // Delete target db if exists.
        await adminDb.none(`DROP DATABASE IF EXISTS "${targetDb}";`);
        console.log(`🧹 Dropped existing database "${targetDb}" (if existed).`);

        // Terminate source db connections.
        await adminDb.none(`
            SELECT pg_terminate_backend(pid)
            FROM pg_stat_activity
            WHERE datname = '${sourceDb}';
        `);

        // Clone target db from source db
        await adminDb.none(`
            CREATE DATABASE "${targetDb}"
            WITH TEMPLATE "${sourceDb}"
            OWNER = "${DATABASE_CONFIG.user}";
        `);
        console.log(`✅ Database "${targetDb}" successfully cloned from "${sourceDb}"`);

        // Connect to created db and clear related tables.
        db = pgp({
            connectionString: connectionString
        })
        await db.none(`DELETE FROM events.approved`);
        await db.none(`DELETE FROM events.executed`);
        await db.none(`DELETE FROM events.revoked`);
        await db.none(`DELETE FROM public.user_function_selector_approvals`);
    })

    it('Should write listened approved event to database', async () => {
        mockApprovedEvent[0].transactionHash = generateHex66();
        await processServantEvents(mockApprovedEvent);

        const data: EventData = await db.one(`SELECT * FROM events.approved`);
        expect(data.transaction_hash).to.be.equal(mockApprovedEvent[0].transactionHash);
    })

    it('Should write listened revoked event to database', async () => {
        mockRevokedEvent[0].transactionHash = generateHex66();
        await processServantEvents(mockRevokedEvent);

        const data: EventData = await db.one(`SELECT * FROM events.revoked`);
        expect(data.transaction_hash).to.be.equal(mockRevokedEvent[0].transactionHash);
    })

    it('Should write listened executed event to database', async () => {
        mockExecutedEvent[0].transactionHash = generateHex66();
        await processServantEvents(mockExecutedEvent);

        const data: EventData = await db.one(`SELECT * FROM events.executed`);
        expect(data.transaction_hash).to.be.equal(mockExecutedEvent[0].transactionHash);
    })

    it('If event is approved then should to insert user_function_selector_approvals function selector and user address', async () => {
        mockApprovedEvent[0].transactionHash = generateHex66();
        await processServantEvents(mockApprovedEvent);

        const event = mockApprovedEvent[0];
        const decodedEventLog = decodeEventLog({
            abi: servant_abi.abi,
            data: event.data,
            topics: event.topics,
        });

        const args = decodedEventLog.args as unknown as ApprovedEvent;
        const data: { user_address: `0x${string}`, function_selector: string } = await db.one(`SELECT * FROM public.user_function_selector_approvals WHERE function_selector = $1 AND user_address = $2`, [args.selector[0], args.user]);

        expect(data.user_address).to.be.equal(args.user);
        expect(data.function_selector).to.be.equal(args.selector[0]);
    })

    it('If event is revoked then should to delete user_function_selector_approvals function selector of user', async () => {
        const approvedEvent = mockApprovedEvent[0];
        const approvedDecodedEventLog = decodeEventLog({
            abi: servant_abi.abi,
            data: approvedEvent.data,
            topics: approvedEvent.topics,
        });

        let args = approvedDecodedEventLog.args as unknown as ApprovedEvent;
        let data: { user_address: `0x${string}`, function_selector: string } = await db.one(`SELECT * FROM public.user_function_selector_approvals WHERE function_selector = $1 AND user_address = $2`, [args.selector[0], args.user]);
        expect(data.user_address).to.be.equal(args.user);
        expect(data.function_selector).to.be.equal(args.selector[0]);

        mockRevokedEvent[0].transactionHash = generateHex66();
        await processServantEvents(mockRevokedEvent);

        data = await db.query(`SELECT * FROM public.user_function_selector_approvals WHERE function_selector = $1 AND user_address = $2`, [args.selector[0], args.user]);
        expect(data).toHaveLength(0);

    })
})