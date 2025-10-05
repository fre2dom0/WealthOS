import type {ModuleWallets} from '../../types/module-wallets.config.type.js';
import servant_artifact from './jsons/servant_artifact.json' with { type: 'json' };

import { createPublicClient, createWalletClient, erc20Abi, getContract, http, publicActions, type Abi, type AbiItem, type Client, type GetContractReturnType, type HttpTransport } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { sepolia } from 'viem/chains'

import { requireEnv } from '../utils/requireEnv.util.js';
import { validateWalletAddress } from '../utils/validators.util.js';
import { infoLog } from '../utils/consoleLoggers.util.js';
import ApiError from '../errors/ApiError.error.js';

const MESSAGE = 'Invalid environment variable : ';
const ABI = [{"inputs":[],"name":"DEFAULT_ADMIN_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MAX_APPROVAL_TIME","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"MIN_APPROVAL_TIME","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"SERVANT_ROLE","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"UPGRADE_INTERFACE_VERSION","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"allFnsApproved","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"time","type":"uint256"},{"internalType":"bytes4[]","name":"addedfnSelectors","type":"bytes4[]"}],"name":"approve","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address[]","name":"modules","type":"address[]"}],"name":"authorizeModule","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"authorizedModules","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"address","name":"module","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"execute","outputs":[{"internalType":"bytes","name":"returnData","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"}],"name":"getRoleAdmin","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"grantRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"hasRole","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"trustedForwarder_","type":"address"},{"internalType":"address","name":"_servant","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"bytes4","name":"","type":"bytes4"}],"name":"isFnApproved","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"forwarder","type":"address"}],"name":"isTrustedForwarder","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"proxiableUUID","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"callerConfirmation","type":"address"}],"name":"renounceRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"revoke","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4[]","name":"removedFnSelectors","type":"bytes4[]"}],"name":"revokeFunctions","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"role","type":"bytes32"},{"internalType":"address","name":"account","type":"address"}],"name":"revokeRole","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceId","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"trustedForwarder","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address[]","name":"modules","type":"address[]"}],"name":"unauthorizeModule","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newImplementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeToAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"userApprovalExpiry","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"version","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"}] as const

/**
 * Reads .env.chain variables
 * @returns Read environment variables
 */
const getEnvironmentVariables = () => {
    const validateEnvironmentAddressVariable = (variable: string, incorrect_variable: string) => {
        const isValidWalletAddress = validateWalletAddress(variable);
        if (!isValidWalletAddress) throw new ApiError(MESSAGE + incorrect_variable + ' - ' + variable);
    }
    try {
        infoLog(`⚠️ Preparing wallet configurations...`);
        
        const forwarder_contract_address = requireEnv('FORWARDER_CONTRACT_ADDRESS');
        validateEnvironmentAddressVariable(forwarder_contract_address, 'FORWARDER_CONTRACT_ADDRESS');

        const servant_contract_address = requireEnv('SERVANT_CONTRACT_ADDRESS');
        validateEnvironmentAddressVariable(servant_contract_address, 'SERVANT_CONTRACT_ADDRESS');

        const servant_account_address = requireEnv('SERVANT_ACCOUNT_ADDRESS');
        validateEnvironmentAddressVariable(servant_account_address, 'SERVANT_ACCOUNT_ADDRESS');

        const servant_account_private_key = requireEnv('SERVANT_ACCOUNT_PRIVATE_KEY');
        
        const owner_account_address = requireEnv('OWNER_ACCOUNT_ADDRESS');
        validateEnvironmentAddressVariable(owner_account_address, 'OWNER_ACCOUNT_ADDRESS');

        const owner_account_private_key = requireEnv('OWNER_ACCOUNT_PRIVATE_KEY');

		infoLog(`✅ Wallet configuration is ready.`);
        return {
            servant_contract_address: servant_contract_address as `0x${string}`,
            servant_account_address: servant_account_address as `0x${string}`,
            servant_account_private_key: servant_account_private_key as `0x${string}`,
            owner_account_address: owner_account_address as `0x${string}`,
            owner_account_private_key: owner_account_private_key as `0x${string}`,
        }
    } catch (err: unknown) {
        ApiError.fatalError(err);
    }
}

/**
 * Creates Web3 client
 * @param private_key Private key of account
 * @returns Client
 */
const createClient = (private_key: `0x${string}`): Client<HttpTransport<undefined, false>> => {
    try {
        const account = privateKeyToAccount(private_key)
    
        const walletClient = createWalletClient({
            account,
            chain: sepolia,
            transport: http()
        }).extend(publicActions)
    
        return walletClient;

    } catch (err: unknown) {
        ApiError.fatalError(err);
    }
}

const { servant_contract_address, servant_account_address, servant_account_private_key, owner_account_address, owner_account_private_key} = getEnvironmentVariables();

const WALLET_CONFIG: ModuleWallets = {
    servant_contract_address,
    servant_account_address,
    servant_account_private_key,
    owner_account_address,
    owner_account_private_key
}

const publicClient = createPublicClient({ chain: sepolia, transport: http() });

const servantClient: Client<HttpTransport<undefined, false>> = createClient(servant_account_private_key);
const ownerClient: Client<HttpTransport<undefined, false>> = createClient(owner_account_private_key);

export const servantContractWithServantClient = getContract({
    address: servant_contract_address,
    abi: ABI, 
    client: servantClient
})

export const servantContractWithOwnerCLient = getContract({
    address: servant_contract_address,
    abi: ABI, 
    client: ownerClient
})

export default WALLET_CONFIG;
