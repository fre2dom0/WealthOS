import { createPublicClient, createWalletClient, getContract, http, type Abi, type AbiItem, type Client, type GetContractReturnType, type HttpTransport } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'
import ADDRESS_CONFIG from '../configs/chain.config.js'
import ApiError from '../errors/ApiError.error.js'

export const ABI = [{ "inputs": [], "name": "DEFAULT_ADMIN_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MAX_APPROVAL_TIME", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "MIN_APPROVAL_TIME", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "SERVANT_ROLE", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "UPGRADE_INTERFACE_VERSION", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "allFnsApproved", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "time", "type": "uint256" }, { "internalType": "bytes4[]", "name": "addedfnSelectors", "type": "bytes4[]" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address[]", "name": "modules", "type": "address[]" }], "name": "authorizeModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "authorizedModules", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "user", "type": "address" }, { "internalType": "address", "name": "module", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "execute", "outputs": [{ "internalType": "bytes", "name": "returnData", "type": "bytes" }], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }], "name": "getRoleAdmin", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "grantRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "hasRole", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "trustedForwarder_", "type": "address" }, { "internalType": "address", "name": "_servant", "type": "address" }], "name": "initialize", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }, { "internalType": "bytes4", "name": "", "type": "bytes4" }], "name": "isFnApproved", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "forwarder", "type": "address" }], "name": "isTrustedForwarder", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "proxiableUUID", "outputs": [{ "internalType": "bytes32", "name": "", "type": "bytes32" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "callerConfirmation", "type": "address" }], "name": "renounceRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "revoke", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4[]", "name": "removedFnSelectors", "type": "bytes4[]" }], "name": "revokeFunctions", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes32", "name": "role", "type": "bytes32" }, { "internalType": "address", "name": "account", "type": "address" }], "name": "revokeRole", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "trustedForwarder", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "address[]", "name": "modules", "type": "address[]" }], "name": "unauthorizeModule", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "newImplementation", "type": "address" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "upgradeToAndCall", "outputs": [], "stateMutability": "payable", "type": "function" }, { "inputs": [{ "internalType": "address", "name": "", "type": "address" }], "name": "userApprovalExpiry", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "version", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "pure", "type": "function" }] as const

/**
 * Creates Web3 client
 * @param private_key Private key of account
 * @returns Client
 */
export const createBlockchainClient = (private_key: `0x${string}`): Client<HttpTransport<undefined, false>> => {
    try {
        const account = privateKeyToAccount(private_key)
        const walletClient = createWalletClient({
            account,
            chain: sepolia,
            transport: http()
        })

        return walletClient;

    } catch (err: unknown) {
        ApiError.fatalError(err);
    }
}

export const publicClient = createPublicClient({ chain: sepolia, transport: http() });

export const servantClient: Client<HttpTransport<undefined, false>> = createBlockchainClient(ADDRESS_CONFIG.servant_account_private_key);
export const ownerClient: Client<HttpTransport<undefined, false>> = createBlockchainClient(ADDRESS_CONFIG.owner_account_private_key);

export const servantContractWithServantClient = getContract({
    address: ADDRESS_CONFIG.servant_contract_address,
    abi: ABI,
    client: { wallet: servantClient, public: publicClient }
})

export const servantContractWithOwnerCLient = getContract({
    address: ADDRESS_CONFIG.servant_contract_address,
    abi: ABI,
    client: { wallet: ownerClient, public: publicClient }
})
