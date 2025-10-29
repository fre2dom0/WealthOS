export const ContractFunctionsMap = {
    Core: [
        'authorizeModuleForVault',
        'revokeModuleForVault',
        'createVault',
        'addMembersToVault',
        'removeMembersFromVault',
        'approveVault',
        'depositToken',
        'withdrawToken',
        'withdrawNative'
    ]
} as const

export type Contracts = keyof typeof ContractFunctionsMap | undefined;
export type CoreFunctions = typeof ContractFunctionsMap['Core'][number]

export const ContractsMap: Record<`0x${string}`, Contracts> = {
    '0x47A5a88b48c1924a7cFf71a87B47F608530B3e34': 'Core'
} as const

