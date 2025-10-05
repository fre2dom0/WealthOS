import { expect } from "chai";
import { network } from "hardhat";
import test, { describe, it, before, beforeEach } from "node:test";
import { decodeErrorResult, encodeFunctionData, formatEther, parseEther, zeroAddress } from "viem";
import ScheduledTransferArtifact from "../../artifacts/contracts/modules/ScheduledTransferModule.module.sol/WealthOSScheduledTransferModule.json"
import WealthOSCoreArtifact from "../../artifacts/contracts/core/WealthOS.sol/WealthOSCore.json"

enum ScheduleType {
    IMMEDIATE_WITHDRAW,
    ON_EXECUTE_WITHDRAW
}

enum ExecutionStatus {
    ACTIVE,    
    CANCELLED,  
    SENT       
}

type ScheduledTransfer = {
    executionTime: bigint;     
    amount: bigint;            
    from: `0x${string}`;              
    to: `0x${string}`;                
    token: `0x${string}`;             
    scheduleType: ScheduleType; 
    status: ExecutionStatus;   
}

type ScheduledTransferRequirements = {
    executionTime: bigint;
    amount: bigint;
    to: `0x${string}`;
    token: `0x${string}`;
    scheduleType: ScheduleType;
}

// HELPER //
const ScheduledTransferObjectConverter = (data: Array<any>): ScheduledTransfer => {
    return {
        executionTime: data[0],
        amount: data[1],
        from: data[2],
        to: data[3],
        token: data[4],
        scheduleType: data[5],
        status: data[6]
    }
}

describe('Scheduled Transfer Module', async () => {
    const ScheduledTransferAbi = ScheduledTransferArtifact.abi;
    const WealthOSCoreAbi = WealthOSCoreArtifact.abi;

    const { viem } = await network.connect();  
    const publicClient = await viem.getPublicClient();
    const testClient = await viem.getTestClient();
    const walletClients = await viem.getWalletClients();

    const [deployer, user, user2, servant] = walletClients;
    const DEPLOYER_ADDRESS = deployer.account.address;
    const USER_ADDRESS = user.account.address;
    const USER_2_ADDRESS = user2.account.address;
    const SERVANT_ACCOUNT_ADDRESS = servant.account.address;

    let MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', 0n]);
    let MockToken2 = await viem.deployContract('MockToken', ['Diamond', 'DIA', 0n]);

    let MOCK_TOKEN_ADDRESS = MockToken.address;
    let MOCK_TOKEN_2_ADDRESS = MockToken2.address;

    let ServantForwarder = await viem.deployContract('WealthOSERC2771Forwarder');
    let ServantImp = await viem.deployContract('WealthOSServantModule', [ServantForwarder.address]);
    let ServantProxy = await viem.deployContract('ERC1967Proxy', [ServantImp.address, '0x']); 
    let ServantModule = await viem.getContractAt('WealthOSServantModule', ServantProxy.address);
    await ServantModule.write.initialize([zeroAddress, SERVANT_ACCOUNT_ADDRESS]);

    let SERVANT_MODULE_ADDRESS = ServantModule.address;

    let WealthOSCoreImp = await viem.deployContract('WealthOSCore');
    let WealthOSCoreProxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '0x']);
    let WealthOSCore = await viem.getContractAt('WealthOSCore', WealthOSCoreProxy.address);
    await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);

    let WEALTHOS_CORE_ADDRESS = WealthOSCore.address;

    let ScheduledTransferImp = await viem.deployContract('WealthOSScheduledTransferModule', []);
    let ScheduledTransferProxy = await viem.deployContract('ERC1967Proxy', [ScheduledTransferImp.address,'0x']); 
    let ScheduledTransferModule = await viem.getContractAt('WealthOSScheduledTransferModule', ScheduledTransferProxy.address);
    await ScheduledTransferModule.write.initialize([WEALTHOS_CORE_ADDRESS, SERVANT_MODULE_ADDRESS]);

    let SCHEDULED_TRANSFER_MODULE_ADDRESS = ScheduledTransferModule.address;

    // TEST VARIABLES //

    const amount = 100n;
    const half_of_amount = amount / 2n;
    const parsed_amount = parseEther('100');
    const one_day_s = 1n * 24n * 60n * 60n;

    let ScheduledTransferRequirementsERC20Immediate: ScheduledTransferRequirements = {
        executionTime: one_day_s,
        amount: half_of_amount,
        to: USER_ADDRESS,
        token: MOCK_TOKEN_ADDRESS,
        scheduleType: ScheduleType.IMMEDIATE_WITHDRAW // IMMEDIATE_WITHDRAW
    }   

    let ScheduledTransferRequirementsNativeImmediate: ScheduledTransferRequirements = {
        executionTime: one_day_s,
        amount: parsed_amount,
        to: USER_ADDRESS,
        token: zeroAddress,
        scheduleType: ScheduleType.IMMEDIATE_WITHDRAW // IMMEDIATE_WITHDRAW
    }

    let ScheduledTransferRequirementsERC20OnExecute: ScheduledTransferRequirements = {
        executionTime: one_day_s,
        amount: half_of_amount,
        to: USER_ADDRESS,
        token: MOCK_TOKEN_ADDRESS,
        scheduleType: ScheduleType.ON_EXECUTE_WITHDRAW // ON_EXECUTE_WITHDRAW
    }

    let ScheduledTransferRequirementsNativeOnExecute: ScheduledTransferRequirements = {
        executionTime: one_day_s,
        amount: parsed_amount,
        to: USER_ADDRESS,
        token: zeroAddress,
        scheduleType: ScheduleType.ON_EXECUTE_WITHDRAW // ON_EXECUTE_WITHDRAW
    }

    beforeEach(async () => {
        // DEPLOYMENTS //
        ServantForwarder = await viem.deployContract('WealthOSERC2771Forwarder');
        ServantImp = await viem.deployContract('WealthOSServantModule', [ServantForwarder.address]);
        ServantProxy = await viem.deployContract('ERC1967Proxy', [ServantImp.address, '0x']); 
        ServantModule = await viem.getContractAt('WealthOSServantModule', ServantProxy.address);
        await ServantModule.write.initialize([zeroAddress, SERVANT_ACCOUNT_ADDRESS]);

        SERVANT_MODULE_ADDRESS = ServantModule.address;

        WealthOSCoreImp = await viem.deployContract('WealthOSCore');
        WealthOSCoreProxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '0x']);
        WealthOSCore = await viem.getContractAt('WealthOSCore', WealthOSCoreProxy.address);
        await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);

        WEALTHOS_CORE_ADDRESS = WealthOSCore.address;

        ScheduledTransferImp = await viem.deployContract('WealthOSScheduledTransferModule', []);
        ScheduledTransferProxy = await viem.deployContract('ERC1967Proxy', [ScheduledTransferImp.address,'0x']); 
        ScheduledTransferModule = await viem.getContractAt('WealthOSScheduledTransferModule', ScheduledTransferProxy.address);
        await ScheduledTransferModule.write.initialize([WEALTHOS_CORE_ADDRESS, SERVANT_MODULE_ADDRESS]);

        SCHEDULED_TRANSFER_MODULE_ADDRESS = ScheduledTransferModule.address;

        MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', amount]);
        MockToken2 = await viem.deployContract('MockToken', ['Diamond', 'DIA', amount]);

        MOCK_TOKEN_ADDRESS = MockToken.address;
        MOCK_TOKEN_2_ADDRESS = MockToken2.address;
        const SERVANT_ROLE = await ServantModule.read.SERVANT_ROLE();
        
        // PRE-SETTINGS //
        MockToken.write.mint([amount], {account: USER_ADDRESS});
        MockToken2.write.mint([amount], {account: USER_ADDRESS});
        MockToken.write.mint([amount], {account: USER_2_ADDRESS});
        MockToken2.write.mint([amount], {account: USER_2_ADDRESS}); 

        MockToken.write.approve([WEALTHOS_CORE_ADDRESS, amount], {account: DEPLOYER_ADDRESS});
        MockToken2.write.approve([WEALTHOS_CORE_ADDRESS, amount], {account: DEPLOYER_ADDRESS});
        MockToken.write.approve([WEALTHOS_CORE_ADDRESS, amount], {account: USER_ADDRESS});
        MockToken2.write.approve([WEALTHOS_CORE_ADDRESS, amount], {account: USER_ADDRESS});
        MockToken.write.approve([WEALTHOS_CORE_ADDRESS, amount], {account: USER_2_ADDRESS});
        MockToken2.write.approve([WEALTHOS_CORE_ADDRESS, amount], {account: USER_2_ADDRESS});

        await ServantModule.write.grantRole([SERVANT_ROLE, SERVANT_ACCOUNT_ADDRESS]);
        await ServantModule.write.authorizeModule([[WEALTHOS_CORE_ADDRESS, SCHEDULED_TRANSFER_MODULE_ADDRESS]]);

        await ServantModule.write.approve([3600n, []])
        await ServantModule.write.approve([3600n, []], {account: USER_ADDRESS});
        await ServantModule.write.approve([3600n, []], {account: USER_2_ADDRESS});

        await WealthOSCore.write.authorizeModule([SCHEDULED_TRANSFER_MODULE_ADDRESS]);

        await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]);
        await WealthOSCore.write.createVault([USER_ADDRESS], {account: USER_ADDRESS});
        await WealthOSCore.write.createVault([USER_2_ADDRESS], {account: USER_2_ADDRESS});

        await WealthOSCore.write.authorizeModuleForVault([DEPLOYER_ADDRESS, SCHEDULED_TRANSFER_MODULE_ADDRESS], { account: DEPLOYER_ADDRESS});
        await WealthOSCore.write.authorizeModuleForVault([USER_ADDRESS, SCHEDULED_TRANSFER_MODULE_ADDRESS], { account: USER_ADDRESS});
        await WealthOSCore.write.authorizeModuleForVault([USER_2_ADDRESS, SCHEDULED_TRANSFER_MODULE_ADDRESS], { account: USER_2_ADDRESS});

        await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount}]])
        await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_2_ADDRESS, amount}]])
        await WealthOSCore.write.depositToken([USER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount}]], {account: USER_ADDRESS})
        await WealthOSCore.write.depositToken([USER_ADDRESS, [{token: MOCK_TOKEN_2_ADDRESS, amount}]], {account: USER_ADDRESS})
        await WealthOSCore.write.depositToken([USER_2_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount}]], {account: USER_2_ADDRESS})
        await WealthOSCore.write.depositToken([USER_2_ADDRESS, [{token: MOCK_TOKEN_2_ADDRESS, amount}]], {account: USER_2_ADDRESS})

        await WealthOSCore.write.depositNative({account: DEPLOYER_ADDRESS, value: parsed_amount});
        await WealthOSCore.write.depositNative({account: USER_ADDRESS, value: parsed_amount});
        await WealthOSCore.write.depositNative({account: USER_2_ADDRESS, value: parsed_amount});

        ScheduledTransferRequirementsERC20Immediate = {
            executionTime: one_day_s,
            amount: amount,
            to: USER_ADDRESS,
            token: MOCK_TOKEN_ADDRESS,
            scheduleType: ScheduleType.IMMEDIATE_WITHDRAW // IMMEDIATE_WITHDRAW
        }   

        ScheduledTransferRequirementsNativeImmediate = {
            executionTime: one_day_s,
            amount: parsed_amount,
            to: USER_ADDRESS,
            token: zeroAddress,
            scheduleType: ScheduleType.IMMEDIATE_WITHDRAW // IMMEDIATE_WITHDRAW
        }

        ScheduledTransferRequirementsERC20OnExecute = {
            executionTime: one_day_s,
            amount: amount,
            to: USER_ADDRESS,
            token: MOCK_TOKEN_ADDRESS,
            scheduleType: ScheduleType.ON_EXECUTE_WITHDRAW // ON_EXECUTE_WITHDRAW
        }

        ScheduledTransferRequirementsNativeOnExecute = {
            executionTime: one_day_s,
            amount: parsed_amount,
            to: USER_ADDRESS,
            token: zeroAddress,
            scheduleType: ScheduleType.ON_EXECUTE_WITHDRAW // ON_EXECUTE_WITHDRAW
        }
    }) 

    describe('Vanilla', async () => {
        describe('Schedule Transfer', async () => {
            describe('ERC20 Transfer', async () => {
                it('Should schedule IMMEDIATE_WITHDRAW transfer with correct variables', async () => {
                    // Array check before scheduling
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(0);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(0);

                    // Balance check before scheduling
                    let balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(0n);
                    
                    // Schedule
                    const hash = await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20Immediate]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const block = await publicClient.getBlock({blockNumber: receipt.blockNumber});
                    const scheduledTime = block.timestamp + ScheduledTransferRequirementsERC20Immediate.executionTime;

                    // Array check after scheduling
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(1);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(1);

                    // Index check after scheduling
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([0n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 0n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check after scheduling
                    balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    // Scheduled transfer check after scheduling
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([0n]));
                    expect(scheduledTransfer.executionTime).to.be.equal(scheduledTime);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);
                })

                it('Should schedule ON_EXECUTE_WITHDRAW transfer with correct variables', async () => {
                    // Array check before scheduling
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(0);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(0);
                    
                    // Schedule
                    const hash = await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20OnExecute]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const block = await publicClient.getBlock({blockNumber: receipt.blockNumber});
                    const scheduledTime = block.timestamp + ScheduledTransferRequirementsERC20Immediate.executionTime;

                    // Array check after scheduling
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(1);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(1);

                    // Index check after scheduling
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([0n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 0n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Scheduled transfer check after scheduling
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([0n]));
                    expect(scheduledTransfer.executionTime).to.be.equal(scheduledTime);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);
                })

                it('Should schedule multiple transfer with correct variables', async () => {
                    // Array check before scheduling
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(0);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(0);

                    // Balance check before scheduling
                    let tokenBalanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(tokenBalanceOfModule).to.be.equal(0n);

                    let token2BalanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(token2BalanceOfModule).to.be.equal(0n);
                    
                    // Schedule
                    const hash = await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20Immediate, ScheduledTransferRequirementsERC20OnExecute]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const block = await publicClient.getBlock({blockNumber: receipt.blockNumber});
                    const scheduledTime = block.timestamp + ScheduledTransferRequirementsERC20Immediate.executionTime;

                    // Array check after scheduling
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(2);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(2);

                    // Index check after scheduling
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([0n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([1n]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 0n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 1n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check after scheduling
                    tokenBalanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(tokenBalanceOfModule).to.be.equal(amount);

                    token2BalanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(token2BalanceOfModule).to.be.equal(amount);

                    // Scheduled transfer check after scheduling
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([0n]));
                    expect(scheduledTransfer.executionTime).to.be.equal(scheduledTime);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([1n]));
                    expect(scheduledTransfer.executionTime).to.be.equal(scheduledTime);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);
                })

                it('Should revert if address to send is zero address', async () => {
                    ScheduledTransferRequirementsERC20Immediate.to = zeroAddress;
                    let reverted = false;
                    
                    try {
                        await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20Immediate]]);
                    } catch (err: any) {
                        if (err.details.includes('ZeroAddress')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if amount is zero ', async () => {
                    ScheduledTransferRequirementsERC20Immediate.amount = 0n;
                    let reverted = false;
                    
                    try {
                        await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20Immediate]]);
                    } catch (err: any) {
                        if (err.details.includes('ZeroAmount')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if execution time is zero ', async () => {
                    ScheduledTransferRequirementsERC20Immediate.executionTime = 0n;
                    let reverted = false;
                    
                    try {
                        await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20Immediate]]);
                    } catch (err: any) {
                        if (err.details.includes('InvalidExecutionTime')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if max transfer count(10) exceeds', async () => {
                    let reverted = false;
                    
                    try {
                        for (let i = 0; i < 11; i++) {
                            await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20OnExecute]]);
                        }
                    } catch (err: any) {
                        if (err.details.includes('MaxTransferCountExceeds')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if not enough balance to withdraw on IMMEDIATE_WITHDRAW transfer', async () => {
                    ScheduledTransferRequirementsERC20Immediate.amount = amount * 2n;
                    let reverted = false;
                    
                    try {
                        await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20Immediate]]);
                    } catch (err: any) {
                        if (err.details.includes('InsufficientBalance')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })

            describe('Native Transfer', async () => {
                it('Should schedule IMMEDIATE_WITHDRAW transfer with correct variables', async () => {
                    // Array check before scheduling
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(0);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(0);

                    // Balance check before scheduling
                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(0n);
                    
                    // Schedule
                    const hash = await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsNativeImmediate]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const block = await publicClient.getBlock({blockNumber: receipt.blockNumber});
                    const scheduledTime = block.timestamp + ScheduledTransferRequirementsERC20Immediate.executionTime;

                    // Array check after scheduling
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(1);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(1);

                    // Index check after scheduling
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([0n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 0n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check after scheduling
                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    // Scheduled transfer check after scheduling
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([0n]));
                    expect(scheduledTransfer.executionTime).to.be.equal(scheduledTime);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);
                })

                it('Should schedule ON_EXECUTE_WITHDRAW transfer with correct variables', async () => {
                    // Array check before scheduling
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(0);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(0);

                    // Balance check before scheduling
                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(0n);
                    
                    // Schedule
                    const hash = await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsNativeOnExecute]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const block = await publicClient.getBlock({blockNumber: receipt.blockNumber});
                    const scheduledTime = block.timestamp + ScheduledTransferRequirementsERC20Immediate.executionTime;

                    // Array check after scheduling
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(1);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(1);

                    // Index check after scheduling
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([0n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 0n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check after scheduling
                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(0n);

                    // Scheduled transfer check after scheduling
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([0n]));
                    expect(scheduledTransfer.executionTime).to.be.equal(scheduledTime);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);
                })

                it('Should schedule multiple transfer with correct variables', async () => {
                    // Array check before scheduling
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(0);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(0);

                    // Balance check before scheduling
                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(0n);
                    
                    // Schedule
                    const hash = await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsNativeImmediate, ScheduledTransferRequirementsNativeOnExecute]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const block = await publicClient.getBlock({blockNumber: receipt.blockNumber});
                    const scheduledTime = block.timestamp + ScheduledTransferRequirementsERC20Immediate.executionTime;

                    // Array check after scheduling
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(2);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(2);

                    // Index check after scheduling
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([0n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([1n]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 0n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 1n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check after scheduling
                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    // Scheduled transfer check after scheduling
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([0n]));
                    expect(scheduledTransfer.executionTime).to.be.equal(scheduledTime);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([1n]));
                    expect(scheduledTransfer.executionTime).to.be.equal(scheduledTime);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);
                })

                it('Should revert if address to send is zero address', async () => {
                    ScheduledTransferRequirementsNativeImmediate.to = zeroAddress;
                    let reverted = false;
                    
                    try {
                        await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsNativeImmediate]]);
                    } catch (err: any) {
                        if (err.details.includes('ZeroAddress')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if amount is zero ', async () => {
                    ScheduledTransferRequirementsNativeImmediate.amount = 0n;
                    let reverted = false;
                    
                    try {
                        await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsNativeImmediate]]);
                    } catch (err: any) {
                        if (err.details.includes('ZeroAmount')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if execution time is zero ', async () => {
                    ScheduledTransferRequirementsNativeImmediate.executionTime = 0n;
                    let reverted = false;
                    
                    try {
                        await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsNativeImmediate]]);
                    } catch (err: any) {
                        if (err.details.includes('InvalidExecutionTime')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if max transfer count(10) exceeds', async () => {
                    let reverted = false;
                    
                    try {
                        for (let i = 0; i < 11; i++) {
                            await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsNativeOnExecute]]);
                        }
                    } catch (err: any) {
                        if (err.details.includes('MaxTransferCountExceeds')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
                
                it('Should revert if not enough balance to withdraw on IMMEDIATE_WITHDRAW transfer', async () => {
                    ScheduledTransferRequirementsNativeImmediate.amount = parsed_amount * 2n;
                    let reverted = false;
                    
                    try {  
                        await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsNativeImmediate]]);
                    } catch (err: any) {
                        if (err.details.includes('InsufficientBalance')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })
        })

        describe('Cancel Transfer', async () => {
            let SCHEDULED_TIME: bigint;
            beforeEach(async () => {

                const hash = await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [
                    ScheduledTransferRequirementsERC20Immediate, // Index - 0
                    ScheduledTransferRequirementsNativeImmediate, // Index - 1
                    ScheduledTransferRequirementsERC20OnExecute, // Index - 2
                    ScheduledTransferRequirementsNativeOnExecute // Index - 3
                ]])

                const receipt = publicClient.waitForTransactionReceipt({hash});
                const block = await publicClient.getBlock({blockNumber: (await receipt).blockNumber});
                SCHEDULED_TIME = block.timestamp + one_day_s;
            })

            describe('ERC20 Token' , async () => {
                it('Should cancel scheduled IMMEDIATE_WITHDRAW transfer with correct variables', async () => {
                    const ID_TO_BE_CANCELLED = 0n;

                    // Array check before cancel
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before cancel
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check before CANCEL
                    let balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    let balanceOfUser = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfUser).to.be.equal(0n);

                    // Scheduled transfer check before cancel
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Cancel scheduled transfer
                    await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [ID_TO_BE_CANCELLED]]);

                    // Array check after cancel
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(3);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(3);

                    // Index check after cancel
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should assigned to index 0)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check after cancel
                    balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(0n);

                    balanceOfUser = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfUser).to.be.equal(amount);

                    // Scheduled transfer check after cancel
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.CANCELLED);
                })

                it('Should cancel scheduled ON_EXECUTE_WITHDRAW transfer with correct variables', async () => {
                    const ID_TO_BE_CANCELLED = 2n;

                    // Array check before cancel
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before cancel
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(2n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(2n);

                    // Balance check before CANCEL
                    let balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    let balanceOfUser = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfUser).to.be.equal(0n);

                    // Scheduled transfer check before cancel
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Cancel scheduled transfer
                    await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [ID_TO_BE_CANCELLED]]);

                    // Array check after cancel
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(3);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(3);

                    // Index check after cancel
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should assigned to index 2)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(2n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(2n);

                    // Balance check after cancel
                    balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    balanceOfUser = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfUser).to.be.equal(0n);

                    // Scheduled transfer check after cancel
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.CANCELLED);
                })

                it('Should cancel multiple scheduled transfer with correct variables', async () => {
                    const FIRST_ID_TO_BE_CANCELLED = 0n;
                    const SECOND_ID_TO_BE_CANCELLED = 2n;

                    // Array check before cancel
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before cancel
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([FIRST_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([SECOND_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(2n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, FIRST_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, SECOND_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(2n);

                    // Balance check before CANCEL
                    let balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    let balanceOfUser = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfUser).to.be.equal(0n);

                    // Scheduled transfer check before cancel
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([FIRST_ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([SECOND_ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Cancel scheduled transfer
                    await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [FIRST_ID_TO_BE_CANCELLED, SECOND_ID_TO_BE_CANCELLED]]);

                    // Array check after cancel
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(2);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(2);

                    // Index check after cancel
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([FIRST_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([SECOND_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, FIRST_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, SECOND_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should be assigned to index 0 index 1 stay same)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([1n]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 1n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check after cancel
                    balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(0n);

                    balanceOfUser = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfUser).to.be.equal(amount);

                    // Scheduled transfer check after cancel
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([FIRST_ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.CANCELLED);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([SECOND_ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.CANCELLED);

                })


                it('Should revert if user is not equal to transfer owner', async () => {
                    let reverted = false;
                    try {
                        await ScheduledTransferModule.write.cancelScheduledTransfer([USER_ADDRESS, [0n]], {account: USER_ADDRESS});
                    } catch (err: any) {
                        if (err.details.includes('OnlyTransferOwnerCanCancel')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if transfer is not active', async () => {
                    let reverted = false;
                    try {
                        await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [0n]]);
                        await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [0n]]);
                    } catch (err: any) {
                        if (err.details.includes('OnlyActiveTransfers')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })

            describe('Native Token', async () => {
                it('Should cancel scheduled IMMEDIATE_WITHDRAW transfer with correct variables', async () => {
                    const ID_TO_BE_CANCELLED = 1n;
                    let userBalanceBeforeRefund = await publicClient.getBalance({address: DEPLOYER_ADDRESS});

                    // Array check before cancel
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before cancel
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check before CANCEL
                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    // Scheduled transfer check before cancel
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Cancel scheduled transfer
                    const hash = await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [ID_TO_BE_CANCELLED]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const gasPrice = receipt.gasUsed * receipt.effectiveGasPrice;

                    // Array check after cancel
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(3);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(3);

                    // Index check after cancel
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should assigned to index 1)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check after cancel
                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(0n);

                    let balanceOfUser = await publicClient.getBalance({address :DEPLOYER_ADDRESS});
                    expect(userBalanceBeforeRefund + parsed_amount).to.be.equal(balanceOfUser + gasPrice);

                    // Scheduled transfer check after cancel
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.CANCELLED);
                })

                it('Should cancel scheduled ON_EXECUTE_WITHDRAW transfer with correct variables', async () => {
                    const ID_TO_BE_CANCELLED = 3n;
                    let userBalanceBeforeRefund = await publicClient.getBalance({address: DEPLOYER_ADDRESS});

                    // Array check before cancel
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before cancel
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(3n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(3n);

                    // Balance check before CANCEL
                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    // Scheduled transfer check before cancel
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Cancel scheduled transfer
                    const hash = await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [ID_TO_BE_CANCELLED]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const gasPrice = receipt.gasUsed * receipt.effectiveGasPrice;

                    // Array check after cancel
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(3);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(3);

                    // Index check after cancel
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check after cancel
                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    let balanceOfUser = await publicClient.getBalance({address :DEPLOYER_ADDRESS});
                    expect(userBalanceBeforeRefund).to.be.equal(balanceOfUser + gasPrice);

                    // Scheduled transfer check after cancel
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.CANCELLED);
                })

                it('Should cancel multiple scheduled transfer with correct variables', async () => {
                    const FIRST_ID_TO_BE_CANCELLED = 1n;
                    const SECOND_ID_TO_BE_CANCELLED = 3n;

                    let userBalanceBeforeRefund = await publicClient.getBalance({address: DEPLOYER_ADDRESS});

                    // Array check before cancel
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before cancel
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([FIRST_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, FIRST_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([SECOND_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(3n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, SECOND_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(3n);

                    // Balance check before CANCEL
                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    // Scheduled transfer check before cancel
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([FIRST_ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([SECOND_ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Cancel scheduled transfer
                    const hash = await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [FIRST_ID_TO_BE_CANCELLED, SECOND_ID_TO_BE_CANCELLED]]);
                    const receipt = await publicClient.waitForTransactionReceipt({hash});
                    const gasPrice = receipt.gasUsed * receipt.effectiveGasPrice;

                    // Array check after cancel
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(2);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(2);

                    // Index check after cancel
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([FIRST_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, FIRST_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([SECOND_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, SECOND_ID_TO_BE_CANCELLED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 2 should assigned to index 1)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([2n]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 2n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check after cancel
                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(0n);

                    let balanceOfUser = await publicClient.getBalance({address :DEPLOYER_ADDRESS});
                    expect(userBalanceBeforeRefund + parsed_amount).to.be.equal(balanceOfUser + gasPrice);

                    // Scheduled transfer check after cancel
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([FIRST_ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.CANCELLED);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([SECOND_ID_TO_BE_CANCELLED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.CANCELLED);
                })

                it('Should revert if user is not equal to transfer owner', async () => {
                    let reverted = false;
                    try {
                        await ScheduledTransferModule.write.cancelScheduledTransfer([USER_ADDRESS, [1n]], {account: USER_ADDRESS});
                    } catch (err: any) {
                        if (err.details.includes('OnlyTransferOwnerCanCancel')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if transfer is not active', async () => {
                    let reverted = false;
                    try {
                        await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [1n]]);
                        await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [1n]]);
                    } catch (err: any) {
                        if (err.details.includes('OnlyActiveTransfers')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })

            it('Should revert if nonexistent transfer id entered', async () => {
                let reverted = false;
                try {
                    await ScheduledTransferModule.write.cancelScheduledTransfer([DEPLOYER_ADDRESS, [999n]]);
                } catch (err: any) {
                    if (err.details.includes('NoTransferFound')) reverted = true;
                } finally {
                    expect(reverted).to.be.true;
                }
            })
        })

        describe('Execute Transfer', async () => {

            let SCHEDULED_TIME: bigint;
            beforeEach(async () => {
                MockToken.write.mint([amount], {account: DEPLOYER_ADDRESS});
                await MockToken.write.approve([WEALTHOS_CORE_ADDRESS, amount]);
                await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount}]])
                await WealthOSCore.write.depositNative({value: parsed_amount});

                const hash = await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [
                    ScheduledTransferRequirementsERC20Immediate, // Index - 0
                    ScheduledTransferRequirementsNativeImmediate, // Index - 1
                    ScheduledTransferRequirementsERC20OnExecute, // Index - 2
                    ScheduledTransferRequirementsNativeOnExecute // Index - 3
                ]])

                const receipt = publicClient.waitForTransactionReceipt({hash});
                const block = await publicClient.getBlock({blockNumber: (await receipt).blockNumber});
                SCHEDULED_TIME = block.timestamp + one_day_s;
            })

            describe('ERC20 Token', async () => {
                it('Should execute scheduled IMMEDIATE_WITHDRAW transfer with correct variables', async () => {
                    const ID_TO_BE_EXECUTED = 0n;

                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })

                    // Array check before execution
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before execution
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check before execution
                    let balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    let balanceOfSender = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfSender).to.be.equal(0n);

                    let balanceOfReceiverBeforeExecution = await MockToken.read.balanceOf([USER_ADDRESS]);

                    // Scheduled transfer check before execution
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Execute scheduled transfer
                    await ScheduledTransferModule.write.executeScheduledTransfer([[ID_TO_BE_EXECUTED]]);

                    // Array check after execution
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(3);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(3);

                    // Index check after execution
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should assigned to index 0)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check after execution
                    balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(0n);

                    let balanceOfReceiverAfterExecution = await MockToken.read.balanceOf([USER_ADDRESS]);
                    expect(balanceOfReceiverAfterExecution).to.be.equal(amount);

                    // Scheduled transfer check after execution
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.SENT);
                })

                it('Should execute scheduled ON_EXECUTE_WITHDRAW transfer with correct variables', async () => {
                    const ID_TO_BE_EXECUTED = 2n;

                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })

                    // Array check before execution
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before execution
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(2n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(2n);

                    // Balance check before execution
                    let balanceOfCoreBeforeExecution = await MockToken.read.balanceOf([WEALTHOS_CORE_ADDRESS]);

                    let balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    let balanceOfSender = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfSender).to.be.equal(0n);

                    let balanceOfReceiverBeforeExecution = await MockToken.read.balanceOf([USER_ADDRESS]);

                    // Scheduled transfer check before execution
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Execute scheduled transfer
                    await ScheduledTransferModule.write.executeScheduledTransfer([[ID_TO_BE_EXECUTED]]);

                    // Array check after execution
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(3);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(3);

                    // Index check after execution
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should assigned to index 2)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(2n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(2n);

                    // Balance check after execution
                    let balanceOfCoreAfterExecution = await MockToken.read.balanceOf([WEALTHOS_CORE_ADDRESS]);
                    expect(balanceOfCoreBeforeExecution - amount).to.be.equal(balanceOfCoreAfterExecution);

                    balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    let balanceOfReceiverAfterExecution = await MockToken.read.balanceOf([USER_ADDRESS]);
                    expect(balanceOfReceiverAfterExecution).to.be.equal(amount);

                    // Scheduled transfer check after execution
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.SENT);
                })

                it('Should execute multiple scheduled transfer with correct variables', async () => {
                    const FIRST_ID_TO_BE_EXECUTED = 0n;
                    const SECOND_ID_TO_BE_EXECUTED = 2n;

                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })

                    // Array check before execution
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before execution
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([FIRST_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, FIRST_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([SECOND_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(2n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, SECOND_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(2n);

                    // Balance check before execution
                    let balanceOfCoreBeforeExecution = await MockToken.read.balanceOf([WEALTHOS_CORE_ADDRESS]);

                    let balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(amount);

                    let balanceOfSender = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                    expect(balanceOfSender).to.be.equal(0n);

                    let balanceOfReceiverBeforeExecution = await MockToken.read.balanceOf([USER_ADDRESS]);

                    // Scheduled transfer check before execution
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([FIRST_ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([SECOND_ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Execute scheduled transfer
                    await ScheduledTransferModule.write.executeScheduledTransfer([[FIRST_ID_TO_BE_EXECUTED, SECOND_ID_TO_BE_EXECUTED]]);

                    // Array check after execution
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(2);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(2);

                    // Index check after execution
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([FIRST_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, FIRST_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([SECOND_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, SECOND_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should assigned to index 0)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check after execution
                    let balanceOfCoreAfterExecution = await MockToken.read.balanceOf([WEALTHOS_CORE_ADDRESS]);
                    expect(balanceOfCoreBeforeExecution - amount).to.be.equal(balanceOfCoreAfterExecution);

                    balanceOfModule = await MockToken.read.balanceOf([SCHEDULED_TRANSFER_MODULE_ADDRESS]);
                    expect(balanceOfModule).to.be.equal(0n);

                    let balanceOfReceiverAfterExecution = await MockToken.read.balanceOf([USER_ADDRESS]);
                    expect(balanceOfReceiverAfterExecution).to.be.equal(amount * 2n);

                    // Scheduled transfer check after execution
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([FIRST_ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.SENT);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([SECOND_ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.SENT);
                })

                it('Should revert if too early to execute', async () => {
                    let reverted = false;
                    try {
                        await ScheduledTransferModule.write.executeScheduledTransfer([[0n]]);
                    } catch (err: any) {
                        if (err.details.includes('TooEarlyToExecute')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if transfer is not active', async () => {
                    let reverted = false;
                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })
                    try {
                        await ScheduledTransferModule.write.executeScheduledTransfer([[0n]]);
                        await ScheduledTransferModule.write.executeScheduledTransfer([[0n]]);
                    } catch (err: any) {
                        if (err.details.includes('OnlyActiveTransfers')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if ON_EXECUTE_WITHDRAW if not enough balance', async () => {
                    let reverted = false;
                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })
                    try {
                        await WealthOSCore.write.withdrawToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount}]])
                        await ScheduledTransferModule.write.executeScheduledTransfer([[2n]]);
                    } catch (err: any) {
                        if (err.details.includes('InsufficientBalance')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

            })
            describe('Native Token', async () => {
                it('Should execute scheduled IMMEDIATE_WITHDRAW transfer with correct variables', async () => {
                    const ID_TO_BE_EXECUTED = 1n;

                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })

                    // Array check before execution
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before execution
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check before execution
                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS})
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    let balanceOfReceiverBeforeExecution = await publicClient.getBalance({address: USER_ADDRESS})

                    // Scheduled transfer check before execution
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Execute scheduled transfer
                    await ScheduledTransferModule.write.executeScheduledTransfer([[ID_TO_BE_EXECUTED]]);

                    // Array check after execution
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(3);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(3);

                    // Index check after execution
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should assigned to index 1)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check after execution
                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS})
                    expect(balanceOfModule).to.be.equal(0n);

                    let balanceOfReceiverAfterExecution = await publicClient.getBalance({address: USER_ADDRESS})
                    expect(balanceOfReceiverAfterExecution).to.be.equal(balanceOfReceiverBeforeExecution + parsed_amount);

                    // Scheduled transfer check after execution
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.SENT);
                })

                it('Should execute scheduled ON_EXECUTE_WITHDRAW transfer with correct variables', async () => {
                    const ID_TO_BE_EXECUTED = 3n;

                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })

                    // Array check before execution
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before execution
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(3n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(3n);

                    // Balance check before execution
                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS})
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    let balanceOfReceiverBeforeExecution = await publicClient.getBalance({address: USER_ADDRESS})

                    // Scheduled transfer check before execution
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Execute scheduled transfer
                    await ScheduledTransferModule.write.executeScheduledTransfer([[ID_TO_BE_EXECUTED]]);

                    // Array check after execution
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(3);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(3);

                    // Index check after execution
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 3 should assigned to index 1)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([3n]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 3n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Balance check after execution
                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS})
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    let balanceOfReceiverAfterExecution = await publicClient.getBalance({address: USER_ADDRESS})
                    expect(balanceOfReceiverAfterExecution).to.be.equal(balanceOfReceiverBeforeExecution + parsed_amount);

                    // Scheduled transfer check after execution
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.SENT);
                })

                it('Should execute multiple scheduled transfer with correct variables', async () => {
                    const FIRST_ID_TO_BE_EXECUTED = 1n;
                    const SECOND_ID_TO_BE_EXECUTED = 3n;

                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })

                    // Array check before execution
                    let activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(4);

                    let activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(4);

                    // Index check before execution
                    let indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([FIRST_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    let indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, FIRST_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([SECOND_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(3n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, SECOND_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(3n);

                    // Balance check before execution
                    let balanceOfCoreBeforeExecution = await publicClient.getBalance({address: WEALTHOS_CORE_ADDRESS})

                    let balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS})
                    expect(balanceOfModule).to.be.equal(parsed_amount);

                    let balanceOfReceiverBeforeExecution = await publicClient.getBalance({address: USER_ADDRESS});

                    // Scheduled transfer check before execution
                    let scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([FIRST_ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([SECOND_ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);

                    // Execute scheduled transfer
                    await ScheduledTransferModule.write.executeScheduledTransfer([[FIRST_ID_TO_BE_EXECUTED, SECOND_ID_TO_BE_EXECUTED]]);

                    // Array check after execution
                    activeTransfersOfUser = await ScheduledTransferModule.read.getActiveTransfersOfUser([DEPLOYER_ADDRESS]);
                    expect(activeTransfersOfUser.length).to.be.equal(2);

                    activeTransfers = await ScheduledTransferModule.read.getActiveTransfers();
                    expect(activeTransfers.length).to.be.equal(2);

                    // Index check after execution
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([FIRST_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, FIRST_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([SECOND_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransfer).to.be.equal(0n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, SECOND_ID_TO_BE_EXECUTED]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(0n);

                    // Check new index assignments (Id 2 should assigned to index 1)
                    indexOfActiveTransfer = await ScheduledTransferModule.read.indexOfActiveTransfer([2n]);
                    expect(indexOfActiveTransfer).to.be.equal(1n);

                    indexOfActiveTransferOfUser = await ScheduledTransferModule.read.indexOfActiveTransferOfUser([DEPLOYER_ADDRESS, 2n]);
                    expect(indexOfActiveTransferOfUser).to.be.equal(1n);

                    // Balance check after execution
                    let balanceOfCoreAfterExecution = await publicClient.getBalance({address: WEALTHOS_CORE_ADDRESS});
                    expect(balanceOfCoreBeforeExecution - parsed_amount).to.be.equal(balanceOfCoreAfterExecution);

                    balanceOfModule = await publicClient.getBalance({address: SCHEDULED_TRANSFER_MODULE_ADDRESS});
                    expect(balanceOfModule).to.be.equal(0n);

                    let balanceOfReceiverAfterExecution = await publicClient.getBalance({address: USER_ADDRESS});
                    expect(balanceOfReceiverAfterExecution).to.be.equal(balanceOfReceiverBeforeExecution + (parsed_amount * 2n));

                    // Scheduled transfer check after execution
                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([FIRST_ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.IMMEDIATE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.SENT);

                    scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([SECOND_ID_TO_BE_EXECUTED]));
                    expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
                    expect(scheduledTransfer.amount).to.be.equal(parsed_amount);
                    expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
                    expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
                    expect(scheduledTransfer.token.toLowerCase()).to.be.equal(zeroAddress);
                    expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
                    expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.SENT);
                })

                it('Should revert if too early to execute', async () => {
                    let reverted = false;
                    try {
                        await ScheduledTransferModule.write.executeScheduledTransfer([[1n]]);
                    } catch (err: any) {
                        if (err.details.includes('TooEarlyToExecute')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if transfer is not active', async () => {
                    let reverted = false;
                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })
                    try {
                        await ScheduledTransferModule.write.executeScheduledTransfer([[1n]]);
                        await ScheduledTransferModule.write.executeScheduledTransfer([[1n]]);
                    } catch (err: any) {
                        if (err.details.includes('OnlyActiveTransfers')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if ON_EXECUTE_WITHDRAW if not enough balance', async () => {
                    let reverted = false;
                    // Increase time
                    await testClient.increaseTime({
                        seconds: Number(one_day_s) + 1
                    })
                    try {
                        await WealthOSCore.write.withdrawNative([DEPLOYER_ADDRESS, parsed_amount])
                        await ScheduledTransferModule.write.executeScheduledTransfer([[3n]]);
                    } catch (err: any) {
                        if (err.details.includes('InsufficientBalance')) reverted = true;
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })


            it('Should revert if nonexistent transfer id entered', async () => {
                let reverted = false;
                // Increase time
                await testClient.increaseTime({
                    seconds: Number(one_day_s) + 1
                })
                try {
                    await ScheduledTransferModule.write.executeScheduledTransfer([[999n]]);
                } catch (err: any) {
                    if (err.details.includes('NoTransferFound')) reverted = true;
                } finally {
                    expect(reverted).to.be.true;
                }
            })
        })
    });

    describe('Paused', async () => {
        it('Should scheduling stop if scheduling is paused', async () => {
            let reverted = false;
            try {
                await ScheduledTransferModule.write.pauseOrStartSchedulingTransfer();
                await ScheduledTransferModule.write.scheduleTransfer([DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20OnExecute]])
            } catch (err: any) {
                if (err.details.includes('ExpectedPause')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })
    })

    describe('Servant Module', async () => {
        it('Should servant schedule transfer', async () => {
            const data = encodeFunctionData({
                abi: ScheduledTransferAbi,
                functionName: 'scheduleTransfer',
                args: [DEPLOYER_ADDRESS, [ScheduledTransferRequirementsERC20OnExecute]]
            })
            
            const balanceOfUserBeforeCall = await publicClient.getBalance({address: DEPLOYER_ADDRESS});

            const hash = await ServantModule.write.execute([DEPLOYER_ADDRESS, SCHEDULED_TRANSFER_MODULE_ADDRESS, data], {account: SERVANT_ACCOUNT_ADDRESS})
            const receipt = publicClient.waitForTransactionReceipt({hash});
            const block = await publicClient.getBlock({blockNumber: (await receipt).blockNumber});
            const SCHEDULED_TIME = block.timestamp + one_day_s;

            const balanceOfUserAfterCall = await publicClient.getBalance({address: DEPLOYER_ADDRESS});
            expect(balanceOfUserBeforeCall).to.be.equal(balanceOfUserAfterCall)

            const scheduledTransfer = ScheduledTransferObjectConverter(await ScheduledTransferModule.read.scheduledTransfer([0n]));
            expect(scheduledTransfer.executionTime).to.be.equal(SCHEDULED_TIME);
            expect(scheduledTransfer.amount).to.be.equal(amount);
            expect(scheduledTransfer.from.toLowerCase()).to.be.equal(DEPLOYER_ADDRESS);
            expect(scheduledTransfer.to.toLowerCase()).to.be.equal(USER_ADDRESS);
            expect(scheduledTransfer.token.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
            expect(scheduledTransfer.scheduleType).to.be.equal(ScheduleType.ON_EXECUTE_WITHDRAW);
            expect(scheduledTransfer.status).to.be.equal(ExecutionStatus.ACTIVE);
        })
        it('Should revert if someone except user and servant tries to call', async () => {
            let reverted = false;
            try {
                await ScheduledTransferModule.write.scheduleTransfer([USER_ADDRESS, [ScheduledTransferRequirementsERC20OnExecute]]);
            } catch (err: any) {
                if (err.details.includes('OnlyUserOrServant')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })
    });
})