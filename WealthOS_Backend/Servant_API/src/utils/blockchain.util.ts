import { publicClient } from "../libs/blockchain.lib.js";

export const getBlockTimestamp = async (block_hash: `0x${string}`): Promise<bigint> => {
    const block = await publicClient.getBlock({
        blockHash: block_hash
    })

    console.log(block.timestamp);
    return block.timestamp;
}
