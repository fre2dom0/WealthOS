import TestAgent from "supertest/lib/agent";
import { SESSION_SIGNATURE, WALLET } from "../config/test.config";
import { signMessage } from "viem/accounts";
import { Response } from "supertest";

export const createSession = async (agent: TestAgent, address: `0x${string}`): Promise<Response> => {
    const response = await agent.post(`/session/create_session_test`)
        .send({
            address,
        })

    return response;
}

export const destroySession = async (agent: TestAgent, address: `0x${string}`): Promise<Response> => {
    const response = await agent.post(`/session/destroy_session_test`)

    return response;
}