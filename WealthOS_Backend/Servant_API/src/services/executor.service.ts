import { encodeFunctionData, formatEther, type Abi } from "viem";
import { devLog, errorLog } from "../utils/consoleLoggers.util.js";
import core_abi from '../configs/jsons/wealthos_artifact.json' with {type: 'json'};
import { execute } from "../libs/blockchain.lib.js";
import { validateData, validateWalletAddress } from "../utils/validators.util.js";
import { ApiError } from "../errors/ApiError.error.js";
import { ContractFunctionsMap, ContractsMap, type Contracts, type CoreFunctions } from "../../types/blockchain/contracts.type.js";


validateWalletAddress
const validate = (contractAddress: keyof typeof ContractsMap, functionName: string, args: any[]) => {
    const argsTypeChecker = (contract: Contracts, functionName: CoreFunctions, args: any[]) => {
        const numberChecker = (amount: number) => {
            if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
                throw new ApiError(`Invalid amount.`, 'BAD_REQUEST');
            }
        }

        const addressChecker = (addresses: `0x${string}`[]) => {
            if (Array.isArray(addresses)) {
                for (const address of addresses) {
                    const isAddressValid = validateWalletAddress(address)
                    if (!isAddressValid) throw new ApiError(`Invalid token address.`, 'BAD_REQUEST');
                }
            } else {
                const address: `0x${string}` = addresses;
                const isAddressValid = validateWalletAddress(address)
                if (!isAddressValid) throw new ApiError(`Invalid token address.`, 'BAD_REQUEST');
            }
        }

        const data = args[1];
        switch(contract) {
                case 'Core':
                    switch(functionName) {
                        case 'depositToken':
                        case 'withdrawToken':
                            const token_data = data;

                            if (!Array.isArray(token_data)) {
                                throw new ApiError('Expected an array of token data at arguments', 'BAD_REQUEST');
                            }

                            token_data.forEach((item, index) => {
                                if (typeof item !== 'object' || item === null) {
                                    throw new ApiError(`Token data is not an object.`, 'BAD_REQUEST');
                                }

                                const { amount, token } = item;
                                console.log(token)

                                numberChecker(amount)
                                addressChecker(token);
                            });
                            break;
                        case 'withdrawNative': 
                            const amount: number = data;
                            numberChecker(amount);
                            break;  
                        case 'approveVault': 
                            const vaultId: number = data;          
                            numberChecker(vaultId);
                            break;
                        case 'addMembersToVault':
                        case 'removeMembersFromVault':
                            const members = data
                            addressChecker(members);
                            break;
                        case 'revokeModuleForVault':
                        case 'authorizeModuleForVault':
                            const module = data
                            addressChecker(module);
                            break;
                        default:
                            throw new ApiError('No function matched with WealthOS Core contract', 'BAD_REQUEST');
                }
            
        }
    }
    const contractType = ContractsMap[contractAddress];
    if (!contractType) throw new Error('Contract not found');

    const contract: Contracts = ContractsMap[contractAddress];
    validateData({functionName, args}, true);

    let abi;
    switch(contract) {
        case 'Core':
            abi = core_abi.abi;
            argsTypeChecker(contract, functionName as CoreFunctions, args);
            break;
        default:
            throw new ApiError('Contract not found', 'BAD_REQUEST');
    }

    return abi;
}

export async function executorService (userAddress: `0x${string}`, contractAddress: keyof typeof ContractsMap, functionName: string, _args: any[]) {
    try {
        if (!Array.isArray(_args)) throw new ApiError('Argumenst should be an array', 'BAD_REQUEST');
        const args = [userAddress, ..._args as any[]];
        
        devLog(`Executuion of`);
        devLog(`User: ${userAddress}`);
        devLog(`Contract: ${contractAddress}`);
        devLog(`Function: ${functionName}`);
        devLog(`Args: ${JSON.stringify(args)}`);


        const abi = validate(contractAddress, functionName, args);
        const encodedFn: `0x${string}` = encodeFunctionData({
            abi,
            functionName,
            args
        })

        devLog(`Encoded FN : ${encodedFn}`, 'INFO');

        return await execute([userAddress, contractAddress, encodedFn]);
    } catch (err: unknown) {
        errorLog(`An error occurred while executing: ${err}`);
        throw err;
    }
}



        // const servantAccountAddress = CHAIN_CONFIG.servant_account_address;
        // const gasLimit = await servantContractWithServantClient.estimateGas.execute([userAddress, contractAddress, encodedFn], { account: servantAccountAddress });

        // devLog(`Gas limit: ${formatEther(gasLimit).toString()} as ETH - ${gasLimit.toString()} as Wei`, 'INFO');

        // const servantAddress = servantClient.account?.address;
        // if (!servantAddress) throw new ApiError('No servant found');
        // const { result } = await servantContractWithServantClient.simulate.execute([userAddress, contractAddress, encodedFn], { account: servantAddress });
        // devLog(`Result: ${result}`);
        
        // const hash = await servantContractWithServantClient.write.execute([userAddress, contractAddress, encodedFn], {
        //     gasLimit: gasLimit + ((gasLimit * 20n) / 100n),
        //     account: servantAccountAddress,
        //     chain: servantClient.chain,
        // });

        // const hash = await walletClient.writeContract({
        //     address: CHAIN_CONFIG.servant_contract_address,
        //     abi: servant_abi.abi,
        //     functionName: 'execute',
        //     args: [userAddress, contractAddress, encodedFn],
        //     account: privateKeyToAccount(CHAIN_CONFIG.servant_account_private_key)
        // })

        // devLog(`Hash: ${hash}`, 'SUCCESS');


        // // devLog(`Execution is successfull: ${hash}`);
        // return { hash };