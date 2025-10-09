import type {BlockchainAddresses} from '../../types/module-wallets.config.type.js';

import { requireEnv } from '../utils/requireEnv.util.js';
import { validateWalletAddress } from '../utils/validators.util.js';
import { infoLog } from '../utils/consoleLoggers.util.js';
import ApiError from '../errors/ApiError.error.js';

const MESSAGE = 'Invalid environment variable : ';

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
        infoLog(`Preparing blockchain configurations...`, 'WAITING');
        
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

        const chain_name = requireEnv('CHAIN')

		infoLog(`Blockchain configuration is ready.`, 'SUCCESS');
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


const { servant_contract_address, servant_account_address, servant_account_private_key, owner_account_address, owner_account_private_key} = getEnvironmentVariables();

const ADDRESS_CONFIG: BlockchainAddresses = {
    servant_contract_address,
    servant_account_address,
    servant_account_private_key,
    owner_account_address,
    owner_account_private_key
}

export default ADDRESS_CONFIG;
