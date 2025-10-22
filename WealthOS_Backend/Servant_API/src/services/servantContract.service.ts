// import { encodeFunctionData, erc20Abi, formatEther, type Abi } from "viem";
// import { ADDRESS_CONFIG servan } from "../configs/chain.config.js";
// import { devLog } from "../utils/consoleLoggers.util.js";
// import { sepolia } from "viem/chains";

// export const servantExecuteService = async (userAddress: `0x${string}`, contractAddress: `0x${string}`, functionName: string, args: string[], abi: Abi) => {
//     const encodedFn = encodeFunctionData({
//         abi,
//         functionName,
//         args
//     })

//     const servantAccountAddress = ADDRESS_CONFIG.servant_account_address;
//     const gasLimit = await servantContractWithServantClient.estimateGas.execute([userAddress, contractAddress, encodedFn], { account: servantAccountAddress });
//     devLog(`Gas limit: ${formatEther(gasLimit).toString()} as ETH - ${gasLimit.toString()} as Wei`);

//     const hash = await servantContractWithServantClient.write.execute([userAddress, contractAddress, encodedFn], {
//         gas: gasLimit, 
//         account: servantAccountAddress ,
//         chain: servantClient.chain
//     });

//     devLog(`Hash: ${hash}`);
//     return hash;
// }