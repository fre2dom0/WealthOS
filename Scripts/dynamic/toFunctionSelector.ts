import { AbiParameter, AbiStateMutability, toFunctionSelector } from 'viem'
import fs from 'fs'

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
        const [, , arg] = process.argv

        if (!arg) {
            console.error('❌ Missing argument. Provide either a JSON ABI path or a function signature.')
            console.error('Example: npx tsx script.ts ./Contract.json OR ts-node script.ts "transfer(address,uint256)"')
            process.exit(1)
        }

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

            artifact.abi.forEach((i: any) => {
                if (i.stateMutability != 'payable' && i.stateMutability != 'nonpayable') return;
                if (i.name == undefined ) return;

                const selector = toFunctionSelector({
                    name: i.name || '',
                    type: 'function',
                    inputs: i.inputs as readonly AbiParameter[],
                    outputs: i.outputs as readonly AbiParameter[],
                    stateMutability: i.stateMutability as AbiStateMutability,
                })

                let params: string = '';
                const len = i.inputs.length;
                i.inputs.forEach((p: AbiParameter, index: number) => {
                    params += `${p.type} ${p.name}${index != len - 1 ? ', ' : ''}`
                })

                const fn = `${i.name}(${params})`;
                console.log(fn, selector, artifact.contractName)
            })
        } else {
            // Handle direct function signature mode
            const functions = arg.split('-')
            functions.forEach((fn) => {
                console.log(toFunctionSelector(fn.trim()))
            })
        }
    } catch (err: any) {
        console.error('An error occurred:', err.message)
    }
}

main()
