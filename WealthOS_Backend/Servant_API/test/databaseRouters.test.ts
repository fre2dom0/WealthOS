
import '../src/libs/loadEnv.lib.js';
import type { ContractData } from '../types/db/contracts.type.js'
import type { FunctionSelectorData } from '../types/db/function-selectors.type.js'
import type { UserFunctionSelectorApprovalsData } from '../types/db/user-function-selector-approvals.type.js'
import type { ApiResponse } from '../types/response.type.js';

import pgPromise from "pg-promise";
import request from 'supertest';
import { afterAll, beforeAll, describe, beforeEach, afterEach, expect, it } from "vitest";
import { connectionString, DATABASE_CONFIG } from "../src/configs/database.config.js";

import { createApp } from '../src/libs/createApp.lib.js'
import { createSession } from './utils/session.util.js';
import { RATE_LIMITS, WALLET } from './config/test.config.js';

describe('Database test', async () => {

    const pgp = pgPromise();
    const adminDb = pgp({
        host: DATABASE_CONFIG.host,
        port: DATABASE_CONFIG.port,
        user: DATABASE_CONFIG.user,
        password: DATABASE_CONFIG.password,
        database: "postgres",
    });

    let db: pgPromise.IDatabase<{}, any>;

    const sourceDb: string = "WealthOS_Servant_Module";
    const targetDb: string = "WealthOS_Servant_Module_Test";

    // Default data
    const WEALTHOS_CORE = {
        CONTRACT_ADDRESS: '0x47A5a88b48c1924a7cFf71a87B47F608530B3e34' as `0x${string}`,
        CONTRACT_NAME: 'WealthOS Core',
        FUNCTION_NAME: 'authorizeModule',
        FUNCTION_SELECTOR: '0xa30a8e71',
        DATA: [
            {
                contract_address: '0x47A5a88b48c1924a7cFf71a87B47F608530B3e34',
                function_selector: '0xa30a8e71',
                function: 'authorizeModule',
                description: null,
            },
        ] as FunctionSelectorData[]
    };

    // Secondary data
    const SERVANT_MODULE = {
        CONTRACT_ADDRESS: '0x10806f1f9019f3ba43e7811322324d819eda0e05' as `0x${string}`,
        CONTRACT_NAME: 'Servant Module',
        FUNCTION_NAMES: ['approve', 'grantRole', 'revokeRole', 'unauthorizeModule'],
        FUNCTION_SELECTORS: ['0x182c78dc', '0x2f2ff15d', '0xd547741f', '0x689f5a1c'],
        DATA: [
            {
                contract_address: '0x10806f1f9019f3ba43e7811322324d819eda0e05',
                function_selector: '0x182c78dc',
                function: 'approve',
                description: null,
            },
            {
                contract_address: '0x10806f1f9019f3ba43e7811322324d819eda0e05',
                function_selector: '0x2f2ff15d',
                function: 'grantRole',
                description: null,
            },
            {
                contract_address: '0x10806f1f9019f3ba43e7811322324d819eda0e05',
                function_selector: '0xd547741f',
                function: 'revokeRole',
                description: null,
            },
            {
                contract_address: '0x10806f1f9019f3ba43e7811322324d819eda0e05',
                function_selector: '0x689f5a1c',
                function: 'unauthorizeModule',
                description: null,
            },
        ] as FunctionSelectorData[]
    }

    const USER_ADDRESS: `0x${string}` = WALLET.PUBLIC_KEY;
    const OWNER_ADDRESS: `0x${string}` = WALLET.OWNER_ADDRESS;

    const ROOT_ENDPOINT = '/db';

    const ENDPOINTS = {
        user_function_selector_approvals: '/user_function_selector_approvals',
        contracts: {
            all_contracts: '/contracts/all_contracts',
            insert_contracts: '/contracts/insert_contracts',
            delete_contracts: '/contracts/delete_contracts',
        },
        function_selectors: {
            all_function_selectors: '/function_selectors/all_function_selectors',
            contract_function_selectors: '/function_selectors/contract_function_selectors',
            insert_function_selectors: '/function_selectors/insert_function_selectors',
            delete_function_selectors: '/function_selectors/delete_function_selectors',
            delete_contract_function_selectors: '/function_selectors/delete_contract_function_selectors',
        }
    }

    const clearAllData = async () => {
        await db.none(`DELETE FROM public.user_function_selector_approvals`);
        await db.none(`DELETE FROM static.contracts`);
        await db.none(`DELETE FROM static.function_selectors`);
    }

    const addOnlyDefaultContract = async () => {
        await db.none('INSERT INTO static.contracts (address, name, description) VALUES ($1, $2, $3)', [WEALTHOS_CORE.CONTRACT_ADDRESS, WEALTHOS_CORE.CONTRACT_NAME, null]);
    }

    const addOnlyDefaultFunctionSelectors = async () => {
        await db.none('INSERT INTO static.function_selectors (contract_address, function_selector, function, description) VALUES ($1, $2, $3, $4)', [WEALTHOS_CORE.CONTRACT_ADDRESS, WEALTHOS_CORE.FUNCTION_SELECTOR, WEALTHOS_CORE.FUNCTION_NAME, null]);
    }

    const addDefaultDataToDatabase = async () => {
        await db.none('INSERT INTO static.contracts (address, name, description) VALUES ($1, $2, $3)', [WEALTHOS_CORE.CONTRACT_ADDRESS, WEALTHOS_CORE.CONTRACT_NAME, null]);
        await db.none('INSERT INTO static.function_selectors (contract_address, function_selector, function, description) VALUES ($1, $2, $3, $4)', [WEALTHOS_CORE.CONTRACT_ADDRESS, WEALTHOS_CORE.FUNCTION_SELECTOR, WEALTHOS_CORE.FUNCTION_NAME, null]);
        await db.none('INSERT INTO public.user_function_selector_approvals (user_address, function_selector) VALUES ($1, $2)', [USER_ADDRESS, WEALTHOS_CORE.FUNCTION_SELECTOR]);
    }

    const clearDefaultDataFromDatabase = async () => {
        await db.none('DELETE FROM public.user_function_selector_approvals');
        await db.none('DELETE FROM static.function_selectors WHERE contract_address = $1', [WEALTHOS_CORE.CONTRACT_ADDRESS]);
        await db.none('DELETE FROM static.contracts WHERE address = $1', [WEALTHOS_CORE.CONTRACT_ADDRESS]);
    }

    const addOnlySecondaryContract = async () => {
        await db.none('INSERT INTO static.contracts (address, name, description) VALUES ($1, $2, $3)', [SERVANT_MODULE.CONTRACT_ADDRESS, SERVANT_MODULE.CONTRACT_NAME, null]);
    }

    const addOnlySecondaryFunctionSelectors = async () => {
        // Add all function selectors
        const values: string = SERVANT_MODULE.DATA
            .sort((a, b) => (a.function || '').localeCompare(b.function || '')) // Sort values first
            .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', '); // Create values
        const params = SERVANT_MODULE.DATA.flatMap(d => [d.contract_address, d.function_selector, d.function, d.description]); // Order the parameters
        const query = `INSERT INTO static.function_selectors (contract_address, function_selector, function, description) VALUES ${values}`

        await db.none(query, params);
    }

    const addSecondaryDataToDatabase = async () => {
        await db.none('INSERT INTO static.contracts (address, name, description) VALUES ($1, $2, $3)', [SERVANT_MODULE.CONTRACT_ADDRESS, SERVANT_MODULE.CONTRACT_NAME, null]);

        // Add all function selectors
        const values: string = SERVANT_MODULE.DATA
            .sort((a, b) => (a.function || '').localeCompare(b.function || '')) // Sort values first
            .map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`).join(', '); // Create values
        const params = SERVANT_MODULE.DATA.flatMap(d => [d.contract_address, d.function_selector, d.function, d.description]); // Order the parameters
        const query = `INSERT INTO static.function_selectors (contract_address, function_selector, function, description) VALUES ${values}`

        await db.none(query, params);
    }

    const clearSecondaryDataFromDatabase = async () => {
        await db.none('DELETE FROM static.function_selectors WHERE contract_address = $1', [SERVANT_MODULE.CONTRACT_ADDRESS]);
        await db.none('DELETE FROM static.contracts WHERE address = $1', [SERVANT_MODULE.CONTRACT_ADDRESS]);
    }

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

        // Connect to created db
        db = pgp({
            connectionString: connectionString
        })

        // Clear related datas 
        await clearAllData();
    })


    const agent = request.agent(createApp({ enableRateLimiter: false, enableSession: false }));
    const agentWithSession = request.agent(createApp({ enableRateLimiter: false, enableSession: true }));
    const agentWithSessionAndRateLimiter = request.agent(createApp({ enableRateLimiter: true, enableSession: true }));


    describe('User function selector approvals', () => {
        beforeAll(async () => {
            await addDefaultDataToDatabase();
        })

        const base_endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.user_function_selector_approvals}`;

        it('Should get user function selector approvals by user address', async () => {
            const params: string = new URLSearchParams({ user_address: USER_ADDRESS }).toString();
            const endpoint: string = `${base_endpoint}?${params}`;
            const response = await agent.get(endpoint);
            const response_body: ApiResponse = response.body;
            const data: UserFunctionSelectorApprovalsData = response_body.data[0];

            expect(data.user_address).toBe(USER_ADDRESS);
            expect(data.function_selector).toBe(WEALTHOS_CORE.FUNCTION_SELECTOR);
        })

        it('Should throw error if user address is not valid', async () => {
            const params: string = new URLSearchParams({ user_address: '123' }).toString();
            const endpoint: string = `${base_endpoint}?${params}`;

            const response = await agent.get(endpoint);
            const response_body: ApiResponse = response.body;

            expect(response_body.code).toBe('BAD_REQUEST');
        })

        describe('With restrictions', () => {
            beforeAll(async () => {
                await createSession(agentWithSessionAndRateLimiter, USER_ADDRESS);
            })

            it('Should throw error if given user address is not current session address or owner address', async () => {
                const params: string = new URLSearchParams({ user_address: '123' }).toString();
                const endpoint: string = `${base_endpoint}?${params}`;

                const response = await agentWithSessionAndRateLimiter.get(endpoint);
                const response_body: ApiResponse = response.body
                expect(response_body.code).toBe('UNAUTHORIZED');
            })

            it(`Should throw error if request of user exceeds limit (${RATE_LIMITS.LIMIT_FOR_GET})`, async () => {
                let response;
                for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_GET + 1; i++) {
                    response = await agentWithSessionAndRateLimiter.get(base_endpoint);
                }

                const response_body: ApiResponse = response?.body;
                expect(response_body.code).toBe('TOO_MANY_REQUEST')
            })
        })

        afterAll(async () => {
            await clearDefaultDataFromDatabase();
        })
    })

    describe('Contracts', () => {
        describe('Get', () => {
            beforeAll(async () => {
                await addDefaultDataToDatabase();
                await addSecondaryDataToDatabase();
            })

            const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.contracts.all_contracts}`;

            it('Should get all contracts', async () => {

                const response = await agent.get(endpoint)
                const response_body: ApiResponse = response.body;
                const data: ContractData[] = response_body.data;

                const wealthos_selector = data.find(item => item.address === WEALTHOS_CORE.CONTRACT_ADDRESS);
                const servant_module_selector = data.find(item => item.address === SERVANT_MODULE.CONTRACT_ADDRESS);

                expect(wealthos_selector).toBeDefined();
                expect(servant_module_selector).toBeDefined()

                expect(wealthos_selector?.address).toBe(WEALTHOS_CORE.CONTRACT_ADDRESS);
                expect(wealthos_selector?.name).toBe(WEALTHOS_CORE.CONTRACT_NAME);
                expect(wealthos_selector?.description).toBe(null);

                expect(servant_module_selector?.address).toBe(SERVANT_MODULE.CONTRACT_ADDRESS);
                expect(servant_module_selector?.name).toBe(SERVANT_MODULE.CONTRACT_NAME);
                expect(servant_module_selector?.description).toBe(null);
            })

            describe('With restrictions', () => {
                it(`Should throw error if request of user exceeds limit (${RATE_LIMITS.LIMIT_FOR_GET})`, async () => {
                    let response;
                    for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_GET + 1; i++) {
                        response = await agentWithSessionAndRateLimiter.get(endpoint);
                    }

                    const response_body: ApiResponse = response?.body;
                    expect(response_body.code).toBe('TOO_MANY_REQUEST')
                })
            })

            afterAll(async () => {
                await clearAllData();
            })
        })

        describe('Insert', () => {
            const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.contracts.insert_contracts}`;

            describe('Insert one', () => {
                it('Should insert contract', async () => {
                    const send_data: ContractData[] = [{
                        address: WEALTHOS_CORE.CONTRACT_ADDRESS,
                        name: WEALTHOS_CORE.CONTRACT_NAME,
                        description: null,
                    },]

                    const response = await agent.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })

                afterAll(async () => {
                    await clearAllData();
                })
            })

            describe('Insert multiple', () => {
                it('Should insert multiple contract', async () => {
                    const send_data: ContractData[] = [
                        {
                            address: WEALTHOS_CORE.CONTRACT_ADDRESS,
                            name: WEALTHOS_CORE.CONTRACT_NAME,
                            description: null,
                        },
                        {
                            address: SERVANT_MODULE.CONTRACT_ADDRESS,
                            name: SERVANT_MODULE.CONTRACT_NAME,
                            description: null,
                        }
                    ]

                    const response = await agent.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })

                afterAll(async () => {
                    await clearAllData();
                })
            })

            describe('With restrictions', () => {

                let send_data: ContractData[];

                beforeEach(async () => {
                    send_data = [{
                        address: WEALTHOS_CORE.CONTRACT_ADDRESS,
                        name: WEALTHOS_CORE.CONTRACT_NAME,
                        description: null,
                    }]
                    await createSession(agentWithSession, OWNER_ADDRESS)
                })

                afterEach(async () => {
                    await clearAllData();
                })

                it('Should only owner insert', async () => {


                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })

                it('Should throw error if not owner', async () => {
                    await createSession(agentWithSession, USER_ADDRESS)

                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('UNAUTHORIZED');
                })

                it('Should throw error if no data send', async () => {
                    const response = await agentWithSession.post(endpoint).send({
                        data: ''
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if data length above 10', async () => {
                    const response = await agentWithSession.post(endpoint).send({
                        data: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if address is not valid', async () => {
                    send_data[0]['address'] = '0x123'
                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if values are not valid', async () => {
                    send_data[0]['name'] = ''
                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it(`Should throw error if request of user exceeds limit (${RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE}`, async () => {
                    let response;
                    for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE + 1; i++) {
                        response = await agentWithSessionAndRateLimiter.post(endpoint);
                    }

                    const response_body: ApiResponse = response?.body;
                    expect(response_body.code).toBe('TOO_MANY_REQUEST')
                })
            })
        })

        describe('Delete', () => {
            const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.contracts.delete_contracts}`;

            describe('Delete one', () => {
                beforeAll(async () => {
                    await addDefaultDataToDatabase();
                })

                it('Should delete contract', async () => {
                    const send_data: `0x${string}`[] = [WEALTHOS_CORE.CONTRACT_ADDRESS]

                    const response = await agent.delete(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })
            })

            describe('Delete multiple', () => {
                beforeAll(async () => {
                    await addDefaultDataToDatabase();
                    await addSecondaryDataToDatabase();
                })

                it('Should delete multiple contract', async () => {
                    const send_data: `0x${string}`[] = [WEALTHOS_CORE.CONTRACT_ADDRESS, SERVANT_MODULE.CONTRACT_ADDRESS]

                    const response = await agent.delete(endpoint).send({
                        data: send_data
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })
            })

            describe('With restrictions', () => {
                let send_data: `0x${string}`[] = [WEALTHOS_CORE.CONTRACT_ADDRESS]

                beforeEach(async () => {
                    send_data = [WEALTHOS_CORE.CONTRACT_ADDRESS]
                    await addDefaultDataToDatabase();
                    await createSession(agentWithSession, OWNER_ADDRESS)
                })

                afterEach(async () => {
                    await clearAllData();
                })

                it('Should only owner delete', async () => {
                    const response = await agentWithSession.delete(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })

                it('Should throw error if not owner', async () => {
                    await createSession(agentWithSession, USER_ADDRESS)

                    const response = await agentWithSession.delete(endpoint).send({
                        data: send_data
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('UNAUTHORIZED');
                })

                it('Should throw error if no data send', async () => {
                    const response = await agentWithSession.delete(endpoint).send({
                        data: ''
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if data length above 10', async () => {
                    const response = await agentWithSession.delete(endpoint).send({
                        data: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if address is not valid', async () => {
                    const response = await agentWithSession.delete(endpoint).send({
                        data: ['']
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it(`Should throw error if request of user exceeds limit (${RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE}`, async () => {
                    let response;
                    for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE + 1; i++) {
                        response = await agentWithSessionAndRateLimiter.delete(endpoint);
                    }

                    const response_body: ApiResponse = response?.body;
                    expect(response_body.code).toBe('TOO_MANY_REQUEST')
                })
            })
        })

        afterAll(async () => {
            await clearAllData();
        })
    })

    describe('Function selectors', () => {

        describe('Get', () => {
            beforeAll(async () => {
                await addDefaultDataToDatabase();
                await addSecondaryDataToDatabase();
            })

            it('Should get all function selectors', async () => {
                const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.function_selectors.all_function_selectors}`;

                const response = await agent.get(endpoint)
                const response_body: ApiResponse = response.body;
                const data: FunctionSelectorData[] = response_body.data;

                const wealthos_selector = data.find(item => item.function_selector === WEALTHOS_CORE.FUNCTION_SELECTOR);
                expect(wealthos_selector).toBeDefined();
                expect(wealthos_selector?.contract_address).toBe(WEALTHOS_CORE.CONTRACT_ADDRESS);
                expect(wealthos_selector?.function).toBe(WEALTHOS_CORE.FUNCTION_NAME);
                expect(wealthos_selector?.description).toBe(null);

                const servant_module_selector = data.filter(item => item.contract_address === SERVANT_MODULE.CONTRACT_ADDRESS);
                expect(servant_module_selector.length).toBe(4);
                expect(servant_module_selector[0].function).toBe(SERVANT_MODULE.DATA[0].function);
                expect(servant_module_selector[1].function).toBe(SERVANT_MODULE.DATA[1].function);
                expect(servant_module_selector[2].function).toBe(SERVANT_MODULE.DATA[2].function);
                expect(servant_module_selector[3].function).toBe(SERVANT_MODULE.DATA[3].function);

            });

            it('Should get function selectors by contract address', async () => {
                const params = new URLSearchParams({ contract_address: SERVANT_MODULE.CONTRACT_ADDRESS }).toString();
                const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.function_selectors.contract_function_selectors}?${params}`;

                const response = await agent.get(endpoint)
                const response_body: ApiResponse = response.body;
                const data: FunctionSelectorData[] = response_body.data;
                expect(data.length).toBe(4)
                expect(data[0].function).toBe(SERVANT_MODULE.DATA[0].function);
                expect(data[1].function).toBe(SERVANT_MODULE.DATA[1].function);
                expect(data[2].function).toBe(SERVANT_MODULE.DATA[2].function);
                expect(data[3].function).toBe(SERVANT_MODULE.DATA[3].function);
            });

            afterAll(async () => {
                await clearAllData();
            })

            describe('With restrictions', () => {
                beforeAll(async () => {
                    await createSession(agentWithSession, OWNER_ADDRESS)
                })

                it(`Should throw error if request of user exceeds limit (${RATE_LIMITS.LIMIT_FOR_GET} while get all function selectors`, async () => {
                    const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.function_selectors.all_function_selectors}`;

                    let response;
                    for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_GET + 1; i++) {
                        response = await agentWithSessionAndRateLimiter.get(endpoint);
                    }

                    const response_body: ApiResponse = response?.body;
                    expect(response_body.code).toBe('TOO_MANY_REQUEST')
                })


                it(`Should throw error if request of user exceeds limit (${RATE_LIMITS.LIMIT_FOR_GET} while get selectors by contract address`, async () => {
                    const params = new URLSearchParams({ contract_address: SERVANT_MODULE.CONTRACT_ADDRESS }).toString();
                    const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.function_selectors.contract_function_selectors}?${params}`;

                    let response;
                    for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_GET + 1; i++) {
                        response = await agentWithSessionAndRateLimiter.get(endpoint);
                    }

                    const response_body: ApiResponse = response?.body;
                    expect(response_body.code).toBe('TOO_MANY_REQUEST')
                })

                it('Should throw error if contract address is not valid while get selectors by contract address', async () => {
                    const params = new URLSearchParams({ contract_address: 'dummydata' }).toString();
                    const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.function_selectors.contract_function_selectors}?${params}`;

                    const response = await agentWithSession.get(endpoint);

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST')
                })
            })
        })

        describe('Insert', () => {
            const endpoint: string = `${ROOT_ENDPOINT}${ENDPOINTS.function_selectors.insert_function_selectors}`;
            describe('Insert one', () => {

                beforeAll(async () => {
                    await addOnlyDefaultContract();
                })

                it('Should insert function selectors', async () => {
                    const response = await agent.post(endpoint).send({
                        data: [WEALTHOS_CORE.DATA[0]]
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                });

                afterAll(async () => {
                    await clearAllData();
                })
            })

            describe('Insert multiple', () => {

                beforeAll(async () => {
                    await addOnlyDefaultContract();
                    await addOnlySecondaryContract();
                })

                it('Should insert multiple function selectors', async () => {
                    const response = await agent.post(endpoint).send({
                        data: [WEALTHOS_CORE.DATA[0], SERVANT_MODULE.DATA[0], SERVANT_MODULE.DATA[1]]
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                });

                afterAll(async () => {
                    await clearAllData();
                })
            })

            describe('With restrictions', () => {

                let send_data: FunctionSelectorData[];
                let data: FunctionSelectorData[];

                beforeEach(async () => {
                    send_data = [structuredClone(WEALTHOS_CORE.DATA[0])] // Copy data itself, not memory reference.
                    await addOnlyDefaultContract();
                    await createSession(agentWithSession, OWNER_ADDRESS)
                })

                afterEach(async () => {
                    await clearAllData();
                })

                it('Should only owner insert', async () => {
                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })

                it('Should throw error if not owner', async () => {
                    await createSession(agentWithSession, USER_ADDRESS)

                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('UNAUTHORIZED');
                })

                it('Should throw error if no data send', async () => {
                    const response = await agentWithSession.post(endpoint).send({
                        data: ''
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if data length above 10', async () => {
                    const response = await agentWithSession.post(endpoint).send({
                        data: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if address is not valid', async () => {
                    send_data[0]['contract_address'] = '0x123';
                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if function value is not valid', async () => {
                    send_data[0]['function'] = ''
                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if function selector is not valid', async () => {
                    send_data[0]['function_selector'] = ''
                    const response = await agentWithSession.post(endpoint).send({
                        data: send_data
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it(`Should throw error if request of user exceeds limit (${RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE}`, async () => {
                    let response;
                    for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE + 1; i++) {
                        response = await agentWithSessionAndRateLimiter.post(endpoint);
                    }

                    const response_body: ApiResponse = response?.body;
                    expect(response_body.code).toBe('TOO_MANY_REQUEST')
                })
            })
        })

        describe('Delete', () => {
            const endpoint_selector: string = `${ROOT_ENDPOINT}${ENDPOINTS.function_selectors.delete_function_selectors}`;
            const endpoint_contract: string = `${ROOT_ENDPOINT}${ENDPOINTS.function_selectors.delete_contract_function_selectors}`;


            describe('Delete one', () => {

                beforeAll(async () => {
                    await addOnlyDefaultContract();
                })

                it('Should delete function selectors', async () => {
                    await addOnlyDefaultFunctionSelectors();

                    const response = await agent.delete(endpoint_selector).send({
                        data: [WEALTHOS_CORE.DATA[0].function_selector]
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                });

                it('Should delete function selectors by contract address', async () => {
                    await addOnlyDefaultFunctionSelectors();

                    const response = await agent.delete(endpoint_contract).send({
                        data: [WEALTHOS_CORE.CONTRACT_ADDRESS]
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                });

                afterAll(async () => {
                    await clearAllData();
                })
            })

            describe('Delete multiple', () => {

                beforeAll(async () => {
                    await addOnlyDefaultContract();
                    await addOnlySecondaryContract();
                })

                it('Should delete function selectors', async () => {
                    await addOnlyDefaultFunctionSelectors();
                    await addOnlySecondaryFunctionSelectors();

                    const response = await agent.delete(endpoint_selector).send({
                        data: [WEALTHOS_CORE.DATA[0].function_selector, SERVANT_MODULE.DATA[0].function_selector, SERVANT_MODULE.DATA[1].function_selector, SERVANT_MODULE.DATA[2].function_selector, SERVANT_MODULE.DATA[3].function_selector]
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                });

                it('Should delete function selectors by contract address', async () => {
                    await addOnlyDefaultFunctionSelectors();
                    await addOnlySecondaryFunctionSelectors();

                    const response = await agent.delete(endpoint_contract).send({
                        data: [WEALTHOS_CORE.CONTRACT_ADDRESS, SERVANT_MODULE.CONTRACT_ADDRESS]
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                });

                afterAll(async () => {
                    await clearAllData();
                })
            })

            describe('With restrictions', () => {

                let send_data_selector: string[];
                let send_data_contract: `0x${string}`[]
                beforeEach(async () => {
                    // Copy data itself, not memory reference.
                    send_data_selector = [structuredClone(WEALTHOS_CORE.DATA[0].function_selector)];
                    send_data_contract = [structuredClone(WEALTHOS_CORE.CONTRACT_ADDRESS)];
                    await addOnlyDefaultContract();
                    await addOnlyDefaultFunctionSelectors()
                    await addOnlySecondaryContract();
                    await addOnlySecondaryFunctionSelectors();
                    await createSession(agentWithSession, OWNER_ADDRESS)
                })

                afterEach(async () => {
                    await clearAllData();
                })

                it('Should only owner delete function selectors', async () => {
                    const response = await agentWithSession.delete(endpoint_selector).send({
                        data: send_data_selector
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })

                it('Should only owner delete function selectors by contract address', async () => {
                    const response = await agentWithSession.delete(endpoint_contract).send({
                        data: send_data_contract
                    })

                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('SUCCESS');
                })

                it('Should throw error if not owner', async () => {
                    await createSession(agentWithSession, USER_ADDRESS)

                    let response = await agentWithSession.delete(endpoint_selector).send({
                        data: send_data_selector
                    })

                    let response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('UNAUTHORIZED');

                    response = await agentWithSession.delete(endpoint_contract).send({
                        data: send_data_contract
                    })

                    response_body = response.body;
                    expect(response_body.code).toBe('UNAUTHORIZED');
                })

                it('Should throw error if no data send', async () => {
                    let response = await agentWithSession.delete(endpoint_selector).send({
                        data: ''
                    })

                    let response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');

                    response = await agentWithSession.delete(endpoint_contract).send({
                        data: ''
                    })

                    response_body = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if data length above 10', async () => {
                    let response = await agentWithSession.delete(endpoint_selector).send({
                        data: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
                    })

                    let response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');

                    response = await agentWithSession.delete(endpoint_contract).send({
                        data: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
                    })

                    response_body = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if function selector is not valid', async () => {
                    send_data_selector[0] = '0x123'
                    const response = await agentWithSession.delete(endpoint_selector).send({
                        data: send_data_selector
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it('Should throw error if address is not valid', async () => {
                    send_data_contract[0] = '0x123';
                    const response = await agentWithSession.delete(endpoint_contract).send({
                        data: send_data_contract
                    })
                    const response_body: ApiResponse = response.body;
                    expect(response_body.code).toBe('BAD_REQUEST');
                })

                it(`Should throw error if request of user exceeds limit (${RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE}`, async () => {
                    let response;

                    for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE + 1; i++) {
                        response = await agentWithSessionAndRateLimiter.delete(endpoint_selector);
                    }

                    let response_body: ApiResponse = response?.body;
                    expect(response_body.code).toBe('TOO_MANY_REQUEST')

                    for (let i = 0; i < RATE_LIMITS.LIMIT_FOR_POST_AND_DELETE + 1; i++) {
                        response = await agentWithSessionAndRateLimiter.delete(endpoint_contract);
                    }

                    response_body = response?.body;
                    expect(response_body.code).toBe('TOO_MANY_REQUEST')
                })
            })
        })

    })

})
