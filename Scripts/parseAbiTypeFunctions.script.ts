import type { Abi, AbiFunction } from 'viem'
import artifact from '../WealthOS_Contracts/artifacts/contracts/modules/ServantModule.module.sol/WealthOSServantModule.json' with {type: 'json'}

export const parseFunctionsFromAbi = () => {
    const abi =  artifact.abi as Abi;
    const data = abi.filter((item): item is AbiFunction => item.type == 'function')
    console.log(JSON.stringify(data));
}

parseFunctionsFromAbi()