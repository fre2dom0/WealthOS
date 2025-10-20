import type { ContractData } from '../../../types/db/contracts.type.js';
import ApiError from '../../errors/ApiError.error.js';
import contracts_queries from '../../models/contracts.model.js';
import { validateData, validateWalletAddress } from '../../utils/validators.util.js';

export const getAllContractsService = async (): Promise<ContractData[]> => {
    try {

        return await contracts_queries.getAll();
    } catch (err: unknown) {
        throw err;
    }
}

export const insertContractsService = async (data: ContractData[]) => {
    try {
        if (data.length == 0) throw new ApiError(`No contracts provided.`, 'BAD_REQUEST');
        if (data.length > 10) throw new ApiError("You can insert a maximum of 10 contracts at once.", "BAD_REQUEST");

        const validData: ContractData[] = [];

        for (const d of data) {
            if (!validateWalletAddress(d.address)) throw new ApiError(`The contract address is not valid: ${d.address}`, 'BAD_REQUEST');
            validateData({ name: d.name }, true);

            validData.push({
                address: d.address,
                name: d.name,
                description: d.description?.trim() || null,
            });
        }

        await contracts_queries.insertContracts(validData);
    } catch (err: unknown) {
        throw err;
    }
}

export const deleteContractsService = async (contract_addresses: `0x${string}`[]): Promise<ContractData[]> => {
    try {
        if (contract_addresses.length == 0) throw new ApiError(`No contracts provided.`, 'BAD_REQUEST');
        if (contract_addresses.length > 10) throw new ApiError("You can delete a maximum of 10 contracts at once.", "BAD_REQUEST");

        for (const c of contract_addresses) {
            if (!validateWalletAddress(c)) throw new ApiError(`The contract address is not valid: ${c}`, 'BAD_REQUEST');
        }
        const deletedContracts = await contracts_queries.deleteContracts(contract_addresses);
        return deletedContracts
    } catch (err: unknown) {
        throw err;
    }
}