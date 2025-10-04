import { type Abi, createPublicClient, createWalletClient, getContract, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import servant_artifact from '../artifacts/contracts/modules/ServantModule.module.sol/WealthOSServantModule.json'


export const publicClient = createPublicClient({
	chain: sepolia,
	transport: http(),
})

const abi = servant_artifact.abi as Abi;

const contract = getContract({
	address: '0x045842b774302e889d0691e33688a474d1acfc9b', // Servant Proxy
	abi,
	client: publicClient,
})

const getTrustedForwarder = async (): Promise<unknown> => {
	const tf = await contract.read.trustedForwarder();
	return tf
}

const main = async () => {
	const tf = await getTrustedForwarder();
	console.log("Trusted Forwarder:", tf);
};

main().catch((err) => {
	console.error(err);
	process.exit(1);
});