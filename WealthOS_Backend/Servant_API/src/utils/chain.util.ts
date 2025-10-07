import * as allChains from 'viem/chains';

const chainsArray = Object.values(allChains) as Array<{ id: number; name: string }>;

export const getChainByName = (name: string) => {
    return chainsArray.find(c => c.name === name);
}