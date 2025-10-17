import pgPromise from 'pg-promise';
import { AbiParameter, AbiStateMutability, toFunctionSelector } from 'viem'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config()
/**
 * Generates and logs Ethereum function selectors from either:
 *  - a given contract ABI JSON file, or
 *  - directly provided function signatures.
 *
 * Usage:
 *   npx tsx script.ts ./path/to/Contract.json           // Logs selectors for all nonpayable/payable functions
 *   npx tsx script.ts "transfer(address,uint256),approve(address,uint256)" // Logs selectors for specific functions
 */
const main = async () => {
    try {

        const [, , arg, contract_address] = process.argv

        if (!arg) {
            console.error('❌ Missing argument. Provide either a JSON ABI path or a function signature.');
            console.error('Example: npx tsx script.ts ./Contract.json OR ts-node script.ts "transfer(address,uint256)"');
            process.exit(1);
        }

        if (!contract_address) {
            console.error('❌ Missing argument. Provide a contract address.');
            process.exit(1);
        }

        const user = process.env.DATABASE_USER!;
        const password = process.env.DATABASE_PASSWORD!;
        const host = process.env.DATABASE_HOST!;
        const port = process.env.DATABASE_PORT!;
        const database = process.env.DATABASE!;

        const pgp = pgPromise();
        const db = pgp(`postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`);

        const isJsonPath = arg.endsWith('.json')

        if (isJsonPath) {
            console.log(`\n`);

            // Handle ABI file mode
            if (!fs.existsSync(arg)) {
                console.error(`❌ File not found: ${arg}`)
                process.exit(1)
            }

            const artifact = JSON.parse(fs.readFileSync(arg, 'utf-8'))

            if (!artifact.abi) {
                console.error('❌ Invalid artifact: missing "abi" field.')
                process.exit(1)
            }
            let b = 0;
            for (const i of artifact.abi) {
                // Only functions that effects state of contract.
                if (i.stateMutability != 'payable' && i.stateMutability != 'nonpayable') continue;
                if (!i.name) continue;

                const selector = toFunctionSelector({
                    name: i.name,
                    type: 'function',
                    inputs: i.inputs as readonly AbiParameter[],
                    outputs: i.outputs as readonly AbiParameter[],
                    stateMutability: i.stateMutability as AbiStateMutability,
                });

                await db.none(
                    'INSERT INTO static.function_selectors (contract_address, function_selector, function) VALUES ($1, $2, $3)',
                    [contract_address, selector, i.name]
                );
                console.log('Added : ' + contract_address, selector, i.name, i.stateMutability);
                b++;
            }
            
            console.log(`${b} functions added.`);

        } else {
            // Handle function signature mode
            const functions = arg.split('-')
            functions.forEach((fn) => {
                console.log(toFunctionSelector(fn.trim()))
            })
        }

    } catch (err: unknown) {
        console.error(err);
    }
}

main()
