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
	address: '0x54a68ab7369514ef84ea05adbc1c4cc92357884e', // Servant Proxy
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