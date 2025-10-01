import { isAddress } from "viem";
import ApiError from "#src/errors/ApiError.error.js";

/**
 * Checks empty values of incoming object
 */
export const validateData = (data: object): string[] => {
    const missing: string[] = [];
    
    Object.entries(data).forEach(([key, value]) => {
        if (value == null || value == undefined || value.trim() == '') {
            missing.push(key);
        }
        else if (Array.isArray(value)) {
            const hasEmptyString = value.some(item => {
                return typeof item === 'string' && item.trim() === '';
            });
            if (hasEmptyString) {
                missing.push(key);
            }
        }
    });

    return missing;
};

/**
 * Validates if given data is really an address.
 * @returns Validation data
 */
export const validateWalletAddress = (address: string): boolean => {
    try {
        const isAddressValid = isAddress(address);
        return isAddressValid;
    } catch (err: unknown) {
        throw err;
    }
}