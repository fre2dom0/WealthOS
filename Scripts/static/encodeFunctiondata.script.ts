import { Abi, encodeFunctionData } from "viem"
import artifact from '../../WealthOS_Contracts/artifacts/contracts/core/WealthOS.sol/WealthOSCore.json'
import fs from 'fs'

// /home/cain/Documents/code/WealthOS/WealthOS_Contracts/artifacts/contracts/core/WealthOS.sol/WealthOSCore.json
// depositToken 0xb60706F3B1c3cA291f49BE4a840314a92eEbb12d, [{amount: 1n, token: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238}]

const main = () => {
    try {
        /*
        // const [, , abi_path, functionName, params] = process.argv

        // if (!functionName) {
        //     console.error('❌ Missing argument. Provide a function name.');
        //     process.exit(1);
        // }

        // if (!params) {
        //     console.error('❌ Missing argument. Provide a params with (if multiple put - between parameters).');
        //     process.exit(1);
        // }

        // const parameters = params.split('-').map(e => e.trim()).map(e => {
        //     // e bir array/obj string ise eval ile gerçek JS objesine çevir
        //     if (e.startsWith('[') || e.startsWith('{')) {
        //         return eval(`(${e})`);
        //     }
        //     return e;
        // });

        // if (!abi_path) {
        //     console.error('❌ Missing argument. Provide a JSON ABI.');
        //     process.exit(1);
        // }

        // const isJsonPath = abi_path.endsWith('.json')
        // if (!isJsonPath) throw new Error('Not a json path.');

        // if (!fs.existsSync(abi_path)) {
        //     throw new Error(`File not found: ${abi_path}`);
        // }

        // const artifact = JSON.parse(fs.readFileSync(abi_path, 'utf-8'))

        // if (!artifact.abi) {
        //     throw new Error('❌ Invalid artifact: missing "abi" field.');
        // }
        */

        const encodedFn = encodeFunctionData({
            abi: artifact.abi as Abi,
            functionName: 'depositToken',
            args: ['0xb60706F3B1c3cA291f49BE4a840314a92eEbb12d', [{amount: 1n, token: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'}]]
        })

        console.log(encodedFn);
    }
    catch (err: unknown) {
        console.error(err);
        process.exit(1);
    }
}

main()