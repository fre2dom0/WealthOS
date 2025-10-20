import type { Request, Response, NextFunction } from "express"
import type { ApiResponse } from "../../../types/response.type.js";
import type { ContractData } from "../../../types/db/contracts.type.js";
import { deleteContractsService, getAllContractsService, insertContractsService } from "../../services/db/contracts.service.js";

export const getAllContractsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response: ApiResponse = {
            data: await getAllContractsService(),
            message: 'Contracts successfully fetched!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}

export const insertContractsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data: ContractData[] = req.body.data;

        await insertContractsService(data);

        const response: ApiResponse = {
            message: 'Contracts successfully inserted!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}

export const deleteContractsController = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const contract_addresses: `0x${string}`[] = req.body.data;
        const deletedContracts = await deleteContractsService(contract_addresses);

        const response: ApiResponse = {
            data: deletedContracts,
            message: 'Contracts successfully deleted!',
            code: 'SUCCESS'
        }

        res.status(200).json(response);
    } catch (err: unknown) {
        next(err);
    }
}