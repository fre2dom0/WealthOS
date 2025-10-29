import { createPublicClient, createWalletClient, getContract, http, type Abi, type Client, type GetContractReturnType, type HttpTransport } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import { CHAIN_CONFIG } from '../configs/chain.config.js'
import servant_abi from '../configs/jsons/servant_artifact.json' with {type: 'json'};
import { devLog } from '../utils/consoleLoggers.util.js';



export const publicClient = createPublicClient({ chain: sepolia, transport: http(CHAIN_CONFIG.node_key) });
export const walletClient = createWalletClient({
    chain: sepolia,
    transport: http(CHAIN_CONFIG.node_key)
})

export const execute = async (args: any[]): Promise<`0x${string}`> => {
    try {
        devLog(`Simulating the execution with args: ${args}`, 'INFO');
        const { request } = await publicClient.simulateContract({
            address: CHAIN_CONFIG.servant_contract_address,
            abi: servant_abi.abi,
            functionName: 'execute',
            args,
            account: privateKeyToAccount(CHAIN_CONFIG.servant_account_private_key)
        })
        

        const hash = await walletClient.writeContract(request);
        devLog(`Transaction successfully realized: ${hash}`, 'SUCCESS');
        return hash;
    } catch (err: unknown) {
        throw err;
    }
}
