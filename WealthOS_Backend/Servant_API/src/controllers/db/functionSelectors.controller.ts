
import type { Request, Response, NextFunction } from "express"
import type { ApiResponse } from "../../../types/response.type.js";
import type { FunctionSelectorData } from "../../../types/db/function-selectors.type.js";
import { getAllFunctionSelectorsService, getContractFunctionSelectorsService, insertFunctionSelectorsService, deleteFunctionSelectorsService, deleteContractFunctionSelectorsService } from "../../services/db/functionSelectors.service.js";

export const getAllFunctionSelectorsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response: ApiResponse = {
            data: await getAllFunctionSelectorsService(),
            message: 'Function selectors successfully fetched!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}

export const getContractFunctionSelectorsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract_address: `0x${string}` = req.query.contract_address as `0x${string}`;

        const response: ApiResponse = {
            data: await getContractFunctionSelectorsService(contract_address),
            message: 'Contract function selectors successfully fetched!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err)
    }
}

export const insertFunctionSelectorsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data: FunctionSelectorData[] = req.body.data;
        await insertFunctionSelectorsService(data);

        const response: ApiResponse = {
            message: 'Function selectors successfully inserted!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}

export const deleteFunctionSelectorsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const function_selectors: string[] = req.body.data;;

        const response: ApiResponse = {
            data: await deleteFunctionSelectorsService(function_selectors),
            message: 'Function selectors successfully deleted!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}

export const deleteContractFunctionSelectorsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract_addresses: `0x${string}`[] = req.body.data;;

        const response: ApiResponse = {
            data: await deleteContractFunctionSelectorsService(contract_addresses),
            message: 'Contract function selectors successfully deleted!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}