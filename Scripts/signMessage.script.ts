import { signMessage } from "viem/accounts";
import { zeroAddress } from "viem";
import chalk from "chalk";
import WALLET from "./config.ts"

/**
 *  Creates a signature with given message.
 * @param messageArg The message that wants to be signed.
 * @param p_keyArg Optional private key. If empty script will use the environment variable.
 * @returns A signed message.
 */
const main = async () => {
    try {
        const [ , , messageArg, p_keyArg ] = process.argv;
        if (messageArg == undefined) throw new Error('Please enter a message to sign...');
        let p_key: `0x${string}`;

        if (p_keyArg != undefined) p_key = p_keyArg as `0x${string}`;
        else p_key = WALLET.PRIVATE_KEY as `0x${string}`;

        if (p_key == zeroAddress || p_key == undefined) throw new Error('No private keys found');
            
        const signature = await signMessage({message: messageArg , privateKey: p_key});

        console.log(`The given message is : ${chalk.green.bold(messageArg)}`);
        console.log(`The signature successfully created :`);
        console.log(`${chalk.green.bold(signature)}`);

        return signature;
    } catch (err: any) {
        console.log('An error occurred : ', chalk.red.bold(err.message));
    }
};

main();