import type { FunctionSelectorData } from '../../../types/db/function-selectors.type.js';
import ApiError from '../../errors/ApiError.error.js';
import function_selector_quaries from '../../models/functionSelectors.model.js';
import { validateData, validateWalletAddress } from '../../utils/validators.util.js';

export const getAllFunctionSelectorsService = async (): Promise<FunctionSelectorData[]> => {
    try {
        return await function_selector_quaries.getAll();
    } catch (err: unknown) {
        throw err;
    }
}

export const getContractFunctionSelectorsService = async (contract_address: `0x${string}`): Promise<FunctionSelectorData[]> => {
    try {
        if (!validateWalletAddress(contract_address)) throw new ApiError('The contract address is not valid.', 'BAD_REQUEST');
        return await function_selector_quaries.getContractFunctionSelectors(contract_address);
    } catch (err: unknown) {
        throw err;
    }
}

export const insertFunctionSelectorsService = async (data: FunctionSelectorData[]) => {
    try {
        if (data.length == 0) throw new ApiError(`No function selector provided.`, 'BAD_REQUEST');
        if (data.length > 10) throw new ApiError("You can insert a maximum of 10 function selector at once.", "BAD_REQUEST");

        const validData: FunctionSelectorData[] = [];

        for (const d of data) {
            if (!validateWalletAddress(d.contract_address)) throw new ApiError(`The contract address is not valid: ${d.contract_address}`, 'BAD_REQUEST');
            validateData({ function_selector: d.function_selector, function: d.function }, true);

            validData.push({
                contract_address: d.contract_address,
                function_selector: d.function_selector,
                function: d.function,
                description: d.description?.trim() || null,
            });
        }

        return await function_selector_quaries.insertFunctionSelectors(validData);
    } catch (err: unknown) {
        throw err;
    }
}

export const deleteFunctionSelectorsService = async (function_selectors: string[]): Promise<FunctionSelectorData[]> => {
    try {
        if (function_selectors.length == 0) throw new ApiError('No function selector provided', 'BAD_REQUEST');
        if (function_selectors.length > 10) throw new ApiError("You can delete a maximum of 10 function selectors at once.", "BAD_REQUEST");

        for (const f of function_selectors) {
            if (f.length != 10) throw new ApiError(`The function selector is not valid: ${f}`, 'BAD_REQUEST');
        }

        return await function_selector_quaries.deleteFunctionSelectors(function_selectors)
    } catch (err: unknown) {
        throw err;
    }
}

export const deleteContractFunctionSelectorsService = async (contract_addresses: `0x${string}`[]): Promise<FunctionSelectorData[]> => {
    try {
        if (contract_addresses.length == 0) throw new ApiError('No contract address provided', 'BAD_REQUEST');
        if (contract_addresses.length > 10) throw new ApiError("You can delete a maximum of 10 contract function selectors at once.", "BAD_REQUEST");
        
        for (const c of contract_addresses) {
            if(!validateWalletAddress(c)) throw new ApiError(`The contract address is not valid: ${c}`, 'BAD_REQUEST');
        }

        return await function_selector_quaries.deleteContractFunctionSelectors(contract_addresses)
    } catch (err: unknown) {
        throw err;
    }
}