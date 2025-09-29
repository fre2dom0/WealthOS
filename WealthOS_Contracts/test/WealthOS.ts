import { expect } from "chai";
import { network } from "hardhat";
import { describe, it, beforeEach, before } from "node:test";

import abi from "../artifacts/contracts/types/WealthOSTypes.sol/WealthOSTypes.json";

import { decodeErrorResult, formatEther, formatUnits, parseEther, parseTransaction, toBytes, zeroAddress } from "viem";

describe('WealthOSCore', async () => {
    const getFormattedEther = async (address: `0x${string}`): Promise<string> => {
        return formatEther(await publicClient.getBalance({address}));
    }

    const getBalance = async (address: `0x${string}`): Promise<bigint> => {
        return await publicClient.getBalance({address})
    }

    const { viem } = await network.connect();    

    // Get clients
    const publicClient = await viem.getPublicClient();
    const testClient = await viem.getTestClient();
    const walletClients = await viem.getWalletClients();

    const [deployer, user, user2, user3, mock_module, servant] = walletClients;
    const DEPLOYER_ADDRESS = deployer.account.address;
    const USER_ADDRESS = user.account.address;
    const USER_ADDRESS_2 = user2.account.address;    
    const USER_ADDRESS_3 = user3.account.address;    
    const MOCK_MODULE_ADDRESS = mock_module.account.address;
    const SERVANT_MODULE_ADDRESS = servant.account.address;

    const ether_amount = await getFormattedEther(DEPLOYER_ADDRESS)

    let MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', 0n]);
    let MockToken2 = await viem.deployContract('MockToken', ['Diamond', 'DIA', 0n]);
    let MockToken3 = await viem.deployContract('MockToken', ['Emerald', 'EM', 0n]);
    let MockToken4 = await viem.deployContract('MockToken', ['OIL', 'OIL', 0n]);
    let MockToken5 = await viem.deployContract('MockToken', ['Promethium', 'PM', 0n]);
    let MockToken6 = await viem.deployContract('MockToken', ['Terbium', 'TB', 0n]);

    let MOCK_TOKEN_ADDRESS: `0x${string}`;
    let MOCK_TOKEN_ADDRESS_2: `0x${string}`;
    let MOCK_TOKEN_ADDRESS_3: `0x${string}`;
    let MOCK_TOKEN_ADDRESS_4: `0x${string}`;
    let MOCK_TOKEN_ADDRESS_5: `0x${string}`;
    let MOCK_TOKEN_ADDRESS_6: `0x${string}`;

    let MOCK_TOKENS: `0x${string}`[];

    let WealthOSCoreImp = await viem.deployContract('WealthOSCore');
    let Proxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '' as any]);
    let WealthOSCore = await viem.getContractAt('WealthOSCore', Proxy.address);
    await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);
    await WealthOSCore.write.createVault([DEPLOYER_ADDRESS])

    let CORE_ADDRESS = WealthOSCore.address;

    describe('Vault Operations', async () => {
        beforeEach(async () => {
            WealthOSCoreImp = await viem.deployContract('WealthOSCore');
            Proxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '' as any]);
            WealthOSCore = await viem.getContractAt('WealthOSCore', Proxy.address);
            await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);
            CORE_ADDRESS = WealthOSCore.address;
        })

        it('Should user create vault', async () => {
            // Has no any vault
            let vaultOfUser = await WealthOSCore.read.vaultOfUser([DEPLOYER_ADDRESS]);
            expect(vaultOfUser).to.be.equal(0n);

            // Create vault
            await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]);

            // Has vault
            vaultOfUser = await WealthOSCore.read.vaultOfUser([DEPLOYER_ADDRESS]);
            expect(vaultOfUser).to.be.equal(1n);
        })

        it('Should member approve to participate an existent vault', async () => {
            // Has no approval
            let memberVaultApproval = await WealthOSCore.read.vaultApproval([USER_ADDRESS]);
            expect(memberVaultApproval).to.be.equal(0n);

            await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
            await WealthOSCore.write.approveVault([USER_ADDRESS, 1n], {account: USER_ADDRESS}); // Approve to vault
            
            // Has approval
            memberVaultApproval = await WealthOSCore.read.vaultApproval([USER_ADDRESS]);
            expect(memberVaultApproval).to.be.equal(1n);
        })

        it('Should add member to vault if member approve', async () => {
            // Has no vault
            let vaultOfAddedUser = await WealthOSCore.read.vaultOfUser([USER_ADDRESS]);
            expect(vaultOfAddedUser).to.be.equal(0n);

            await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
            await WealthOSCore.write.approveVault([USER_ADDRESS, 1n], {account: USER_ADDRESS}); // Approve to vault

            await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS]]); // Add member to vault

            // Added to vault
            vaultOfAddedUser = await WealthOSCore.read.vaultOfUser([USER_ADDRESS]);
            expect(vaultOfAddedUser).to.be.equal(1n);

        })

        it('Should remove member from vault if member is participant of vault', async () => {
            await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
            await WealthOSCore.write.approveVault([USER_ADDRESS, 1n], {account: USER_ADDRESS}); // Approve to vault

            await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS]]); // Add member to vault

            // Added to vault
            const vaultOfAddedUser = await WealthOSCore.read.vaultOfUser([USER_ADDRESS]);
            expect(vaultOfAddedUser).to.be.equal(1n);

            await WealthOSCore.write.removeMembersFromVault([DEPLOYER_ADDRESS, [USER_ADDRESS]]); // Remove member from vault

            // Removed from vault
            const vaultOfRemovedUser = await WealthOSCore.read.vaultOfUser([USER_ADDRESS]);
            expect(vaultOfRemovedUser).to.be.equal(0n);
            
        })

        it('Should revert if user already has a vault while creating vault', async () => {
            let reverted = false;
            try {
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
            } catch (err: any) {
                if(err.details.includes('UserIsMemberOfAVault')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if user already has not a vault while user adds member to vault ', async () => {
            let reverted = false;
            try {
                await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS]]); // Add member to vault
            } catch (err: any) {
                if(err.details.includes('UserIsNotMemberOfAVault')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if member is already has a vault while user adds member to vault ', async () => {
            let reverted = false;
            try {
                await WealthOSCore.write.createVault([USER_ADDRESS], {account: USER_ADDRESS}); // Create vault
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
                await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS]]); // Add member to vault
            } catch (err: any) {
                if(err.details.includes('UserIsMemberOfAVault')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if member did not approve vault while user adds member to vault', async () => {
           let reverted = false;
            try {
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
                await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS]]); // Add member to vault
            } catch (err: any) {
                if(err.details.includes('UserDidNotApproveTheVault')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if members length is above than max member count while adding member to vault', async () => {
            let reverted = false;
            try {
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
                await WealthOSCore.write.approveVault([USER_ADDRESS, 1n], {account: USER_ADDRESS}); // Approve to vault
                await WealthOSCore.write.approveVault([USER_ADDRESS_2, 1n], {account: USER_ADDRESS_2}); // Approve to vault
                await WealthOSCore.write.approveVault([USER_ADDRESS_3, 1n], {account: USER_ADDRESS_3}); // Approve to vault

                await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS, USER_ADDRESS_2, USER_ADDRESS_3, DEPLOYER_ADDRESS]]); // Add member to vault
            } catch (err: any) {
                if(err.details.includes('MaxVaultMemberOverflowed')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if vault max member count exceeds while adding member to vault', async () => {
            let reverted = false;
            try {
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault

                await WealthOSCore.write.approveVault([USER_ADDRESS, 1n], {account: USER_ADDRESS}); // Approve to vault
                await WealthOSCore.write.approveVault([USER_ADDRESS_2, 1n], {account: USER_ADDRESS_2}); // Approve to vault
                await WealthOSCore.write.approveVault([USER_ADDRESS_3, 1n], {account: USER_ADDRESS_3}); // Approve to vault

                await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS, USER_ADDRESS_2, USER_ADDRESS_3]]); // Add member to vault
            } catch (err: any) {
                if(err.details.includes('MaxVaultMemberOverflowed')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if user already has not a vault while removes member from vault', async () => {
            let reverted = false;
            try {
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault
                await WealthOSCore.write.approveVault([USER_ADDRESS, 1n], {account: USER_ADDRESS}); // Approve to vault

                await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS]]); // Add member to vault
                await WealthOSCore.write.removeMembersFromVault([USER_ADDRESS_2, [USER_ADDRESS]], {account: USER_ADDRESS_2}); // Remove member from vault
            } catch (err: any) {
                if(err.details.includes('UserIsNotMemberOfAVault')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if vault member count will be 0 while removing member from ', async () => {
            let reverted = false;
            try {
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]); // Create vault

                await WealthOSCore.write.approveVault([USER_ADDRESS, 1n], {account: USER_ADDRESS}); // Approve to vault
                await WealthOSCore.write.approveVault([USER_ADDRESS_2, 1n], {account: USER_ADDRESS_2}); // Approve to vault
                await WealthOSCore.write.approveVault([USER_ADDRESS_3, 1n], {account: USER_ADDRESS_3}); // Approve to vault

                await WealthOSCore.write.addMembersToVault([DEPLOYER_ADDRESS, [USER_ADDRESS, USER_ADDRESS_2]]); // Add member to vault
                await WealthOSCore.write.removeMembersFromVault([DEPLOYER_ADDRESS, [USER_ADDRESS, USER_ADDRESS_2, DEPLOYER_ADDRESS]]); // Remove member from vault

            } catch (err: any) {
                if(err.details.includes('VaultShouldHaveAtLeastOneMember')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })
    })

    describe('User ERC20 & Native', async () => {
        describe('Deposit', async () => {
            beforeEach(async () => {            
                MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', 100n]);
                MockToken2 = await viem.deployContract('MockToken', ['Diamond', 'DIA', 100n]);
                MockToken3 = await viem.deployContract('MockToken', ['Emerald', 'EM', 100n]);
                MockToken4 = await viem.deployContract('MockToken', ['OIL', 'OIL', 100n]);
                MockToken5 = await viem.deployContract('MockToken', ['Promethium', 'PM', 100n]);
                MockToken6 = await viem.deployContract('MockToken', ['Terbium', 'TB', 100n]);
    
                MOCK_TOKEN_ADDRESS = MockToken.address;
                MOCK_TOKEN_ADDRESS_2 = MockToken2.address;
                MOCK_TOKEN_ADDRESS_3 = MockToken3.address;
                MOCK_TOKEN_ADDRESS_4 = MockToken4.address;
                MOCK_TOKEN_ADDRESS_5 = MockToken5.address;
                MOCK_TOKEN_ADDRESS_6 = MockToken6.address;
                MOCK_TOKENS = [MOCK_TOKEN_ADDRESS, MOCK_TOKEN_ADDRESS_2, MOCK_TOKEN_ADDRESS_3, MOCK_TOKEN_ADDRESS_4, MOCK_TOKEN_ADDRESS_5, MOCK_TOKEN_ADDRESS_6];
    
                WealthOSCoreImp = await viem.deployContract('WealthOSCore');
                Proxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '' as any]);
                WealthOSCore = await viem.getContractAt('WealthOSCore', Proxy.address);
                await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);
                await WealthOSCore.write.createVault([DEPLOYER_ADDRESS])
                CORE_ADDRESS = WealthOSCore.address;
    
                // Approve
                await MockToken.write.approve([CORE_ADDRESS, 100000n])
                await MockToken2.write.approve([CORE_ADDRESS, 100000n])
                await MockToken3.write.approve([CORE_ADDRESS, 100000n])
                await MockToken4.write.approve([CORE_ADDRESS, 100000n])
            })
    
            it('Should deposit ERC20 token to WealthOSCore with correct variables', async () => {
    
                // --- ERC20 BALANCE CHECK AND DEPOSIT TO CONTRACT
                let mockTokenBalance = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                expect(mockTokenBalance).to.be.equal(100n);
        
                await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount: 100n}]])
        
                mockTokenBalance = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
                expect(mockTokenBalance).to.be.equal(0n);
                
                // --- BALANCE OF CONTRACT ---
    
                // User's token balance
                const vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS])
                expect(vaultTokenBalance).to.be.equal(100n);
    
                // Given token balance of Contract
                const contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                expect(contractTokenBalance).to.be.equal(100n);
                
                // --- TOKEN EXISTENCE IN CONTRACT ---
    
                // User's token index in array
                const vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS]);
                expect(vaultTokenIndex).to.be.equal(0n);
    
                // First index of user's token list
                const userToken = await WealthOSCore.read.vaultTokens([1n, 0n])
                expect(userToken.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
    
                // Indicator that user has token or not
                const vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS]);
                expect(vaultHasToken).to.be.true;
    
                // Contract's token index in array
                const contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS]);
                expect(contractTokenIndex).to.be.equal(0n);
    
                // First index of contract's token list
                const contractTokens = await WealthOSCore.read.contractTokens([0n]);
                expect(contractTokens.toLowerCase()).to.be.equal(MOCK_TOKEN_ADDRESS);
    
                // Indicator that contract has token or not
                const contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS]);
                expect(contractHasToken).to.be.true;
            })
    
            it('Should deposit multiple ERC20 token to WealthOSCore in batch with correct variables', async () => {
    
                await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [
                    {token: MOCK_TOKEN_ADDRESS, amount: 100n},
                    {token: MOCK_TOKEN_ADDRESS_2, amount: 80n},
                    {token: MOCK_TOKEN_ADDRESS_3, amount: 60n},
                    {token: MOCK_TOKEN_ADDRESS_4, amount: 40n},
                ]])
    
                // --- USER'S BALANCE CHECKS IN THE CONTRACT --- 
    
                let vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS])
                expect(vaultTokenBalance).to.be.equal(100n);
    
                vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS_2])
                expect(vaultTokenBalance).to.be.equal(80n);
                
                vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS_3])
                expect(vaultTokenBalance).to.be.equal(60n);
    
                vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS_4])
                expect(vaultTokenBalance).to.be.equal(40n);
    
                // --- CONTRACT BALANCE CHECKS --- 
    
                let contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                expect(contractTokenBalance).to.be.equal(100n);
    
                contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS_2]);
                expect(contractTokenBalance).to.be.equal(80n);
    
                contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS_3]);
                expect(contractTokenBalance).to.be.equal(60n);
    
                contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS_4]);
                expect(contractTokenBalance).to.be.equal(40n);
    
                // --- INDEX CONTROL OF THE USER'S TOKEN IN THE CONTRACT ---
    
                let vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS]);
                expect(vaultTokenIndex).to.be.equal(0n);
    
                vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_2]);
                expect(vaultTokenIndex).to.be.equal(1n);
    
                vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_3]);
                expect(vaultTokenIndex).to.be.equal(2n);
    
                vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_4]);
                expect(vaultTokenIndex).to.be.equal(3n);
    
                // --- INDEX CONTROL OF THE CONTRACT'S TOKEN ---
    
                let contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS]);
                expect(contractTokenIndex).to.be.equal(0n);
    
                contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_2]);
                expect(contractTokenIndex).to.be.equal(1n);
    
                contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_3]);
                expect(contractTokenIndex).to.be.equal(2n);
    
                contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_4]);
                expect(contractTokenIndex).to.be.equal(3n);
    
                // --- CHECK USER TOKEN ARRAY CONTAINS ALL USER'S TOKENS ---
    
                const MOCK_TOKENS_LOCAL = MOCK_TOKENS.slice(0, 4);
    
                const vaultTokens = await WealthOSCore.read.getVaultTokens([1n]);
                const vaultTokensLowerCase = vaultTokens.map(t => t.toLowerCase());
                expect(vaultTokensLowerCase).to.be.eql(MOCK_TOKENS_LOCAL);
    
                // --- CHECK CONTRACT TOKEN ARRAY CONTAINS ALL USER'S TOKENS ---
    
                const contractTokens = await WealthOSCore.read.getContractTokens();
                const contractTokensLowerCase = contractTokens.map(t => t.toLowerCase());
                expect(contractTokensLowerCase).to.be.eql(MOCK_TOKENS_LOCAL);
    
                // --- CHECK USER HAS TOKENS ---
    
                let vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS]);
                expect(vaultHasToken).to.be.true;
    
                vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_2]);
                expect(vaultHasToken).to.be.true;
    
                vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_3]);
                expect(vaultHasToken).to.be.true;
    
                vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_4]);
                expect(vaultHasToken).to.be.true;
    
                // --- CHECK CONTRACT HAS TOKENS ---
    
                let contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS]);
                expect(contractHasToken).to.be.true;
    
                contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_2]);
                expect(contractHasToken).to.be.true;
    
                contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_3]);
                expect(contractHasToken).to.be.true;
    
                contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_4]);
                expect(contractHasToken).to.be.true;
    
            })
    
            it('Should deposit native token to WealthOSCore with correct variables', async () => {
                const balance_before_deposit = await getBalance(DEPLOYER_ADDRESS);
                const amount = parseEther('10');
    
                const txHash = await WealthOSCore.write.depositNative({account: DEPLOYER_ADDRESS, value: amount});
    
                const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
                const gas_cost = receipt.gasUsed * receipt.effectiveGasPrice;
                
                const balance_after_deposit = await getBalance(DEPLOYER_ADDRESS);
                expect(balance_before_deposit).to.equal(balance_after_deposit + amount + gas_cost);
    
                const vaultNativeBalance = await WealthOSCore.read.vaultNativeBalance([1n]);
                expect(vaultNativeBalance).to.be.equal(amount);
    
                const contractNativeBalance = await WealthOSCore.read.contractNativeBalance();
                expect(contractNativeBalance).to.be.equal(amount);
            });
    
            it('Should revert if amount is zero while depositing ERC20 token to WealthOSCore', async () => {
                let reverted = false;
                try {
                    await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount: 0n}]])
                } catch (err: any) {
                    if(err.details.includes('ZeroAmount')) {
                        reverted = true;
                    }
                } finally {
                    expect(reverted).to.be.true;
                }
            })
    
            it('Should revert if token address is zero address while depositing ERC20 token to WealthOSCore', async () => {
                let reverted = false;
                try {
                    await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: zeroAddress, amount: 100n}]])
                } catch (err: any) {
                    if(err.details.includes('ZeroAddress')) {
                        reverted = true;
                    }
                } finally {
                    expect(reverted).to.be.true;
                }
            })
    
            it('Should revert if amount is zero while depositing native token to WealthOSCore', async () => {
                let reverted = false;
                try {
                    await WealthOSCore.write.depositNative({value: parseEther('0')})
                } catch (err: any) {
                    if(err.details.includes('ZeroAmount')) {
                        reverted = true;
                    }
                } finally {
                    expect(reverted).to.be.true;
                }
            })
        })
    
        describe('Withdraw', async () => {
            describe('General Test', () => {
    
                beforeEach(async () => {
                    // Deploy 
                    MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', 100n]);
                    MockToken2 = await viem.deployContract('MockToken', ['Diamond', 'DIA', 100n]);
                    MockToken3 = await viem.deployContract('MockToken', ['Emerald', 'EM', 100n]);
                    MockToken4 = await viem.deployContract('MockToken', ['OIL', 'OIL', 100n]);
                    MockToken5 = await viem.deployContract('MockToken', ['Promethium', 'PM', 100n]);
                    MockToken6 = await viem.deployContract('MockToken', ['Terbium', 'TB', 100n]);
    
                    MOCK_TOKEN_ADDRESS = MockToken.address;
                    MOCK_TOKEN_ADDRESS_2 = MockToken2.address;
                    MOCK_TOKEN_ADDRESS_3 = MockToken3.address;
                    MOCK_TOKEN_ADDRESS_4 = MockToken4.address;
                    MOCK_TOKEN_ADDRESS_5 = MockToken5.address;
                    MOCK_TOKEN_ADDRESS_6 = MockToken6.address;
                    MOCK_TOKENS = [MOCK_TOKEN_ADDRESS, MOCK_TOKEN_ADDRESS_2, MOCK_TOKEN_ADDRESS_3, MOCK_TOKEN_ADDRESS_4, MOCK_TOKEN_ADDRESS_5, MOCK_TOKEN_ADDRESS_6];
    
                    WealthOSCoreImp = await viem.deployContract('WealthOSCore');
                    Proxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '' as any]);
                    WealthOSCore = await viem.getContractAt('WealthOSCore', Proxy.address);
                    await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);
                    await WealthOSCore.write.createVault([DEPLOYER_ADDRESS])
                    CORE_ADDRESS = WealthOSCore.address;
    
                    // Approve
                    await MockToken.write.approve([CORE_ADDRESS, 100000n])
                    await MockToken2.write.approve([CORE_ADDRESS, 100000n])
                    await MockToken3.write.approve([CORE_ADDRESS, 100000n])
                    await MockToken4.write.approve([CORE_ADDRESS, 100000n])
                })
    
                beforeEach(async () => {
                    await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [
                        {token: MOCK_TOKEN_ADDRESS, amount: 100n},
                        {token: MOCK_TOKEN_ADDRESS_2, amount: 50n},
                        {token: MOCK_TOKEN_ADDRESS_3, amount: 20n},
                        {token: MOCK_TOKEN_ADDRESS_4, amount: 10n},
                    ]]);
        
                    await WealthOSCore.write.depositNative({value: parseEther('100')});
                })
        
                it('Should withdraw ERC20 token from WealthOSCore with correct variables', async () => {
                    const before_vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    const before_contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    const amount = 1n;
        
                    await WealthOSCore.write.withdrawToken([DEPLOYER_ADDRESS, [
                        {token: MOCK_TOKEN_ADDRESS, amount}
                    ]], {account: DEPLOYER_ADDRESS});
        
                    const after_vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    expect(before_vaultTokenBalance).to.be.equal(after_vaultTokenBalance + amount);
        
                    const after_contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    expect(before_contractTokenBalance).to.be.equal(after_contractTokenBalance + amount);
                })
        
                it('Should withdraw multiple ERC20 token from WealthOSCore with correct variables', async () => {
                    const before_first_mockToken_vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    const before_first_mockToken_contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    const first_mockToken_amount = 1n;
        
                    const before_second_mockToken_vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS_2]);
                    const before_second_mockToken_contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS_2]);
                    const second_mockToken_amount = 40n;
        
                    await WealthOSCore.write.withdrawToken([DEPLOYER_ADDRESS, [
                        {token: MOCK_TOKEN_ADDRESS, amount: first_mockToken_amount},
                        {token: MOCK_TOKEN_ADDRESS_2, amount: second_mockToken_amount}
        
                    ]], {account: DEPLOYER_ADDRESS});
        
                    const after_first_mockToken_vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    expect(before_first_mockToken_vaultTokenBalance).to.be.equal(after_first_mockToken_vaultTokenBalance + first_mockToken_amount);
        
                    const after_first_mockToken_contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    expect(before_first_mockToken_contractTokenBalance).to.be.equal(after_first_mockToken_contractTokenBalance + first_mockToken_amount);
        
                    const after_second_mockToken_vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS_2]);
                    expect(before_second_mockToken_vaultTokenBalance).to.be.equal(after_second_mockToken_vaultTokenBalance + second_mockToken_amount);
        
                    const after_second_mockToken_contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS_2]);
                    expect(before_second_mockToken_contractTokenBalance).to.be.equal(after_second_mockToken_contractTokenBalance + second_mockToken_amount);
                })
        
                it('Should remove ERC20 token from user token and contract list of WealthOSCore if balance is 0 with correct variables', async () => {
                    // Get token balance as amount
                    const amount = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    
                    let beforeContractTokenList = await WealthOSCore.read.getContractTokens();
                    let beforeUserTokenList = await WealthOSCore.read.getVaultTokens([1n]);
                    
                    // Convert to lower case
                    beforeContractTokenList = beforeContractTokenList.map(t => t.toLowerCase() as `0x${string}`);
                    beforeUserTokenList = beforeUserTokenList.map(t => t.toLowerCase() as `0x${string}`);
        
                    // Before includes check
        
                    let includes = beforeContractTokenList.includes(MOCK_TOKEN_ADDRESS);
                    expect(includes).to.be.true;
        
                    includes = beforeUserTokenList.includes(MOCK_TOKEN_ADDRESS);
                    expect(includes).to.be.true;
        
                    // Before user token index check
                    
                    let index = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS]);
                    expect(index).to.be.equal(0n);
        
                    index = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_2]);
                    expect(index).to.be.equal(1n);
        
                    index = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_3]);
                    expect(index).to.be.equal(2n);
        
                    index = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_4]);
                    expect(index).to.be.equal(3n);
        
                    // Before contract token index check
        
                    index = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS]);
                    expect(index).to.be.equal(0n);
        
                    index = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_2]);
                    expect(index).to.be.equal(1n);
        
                    index = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_3]);
                    expect(index).to.be.equal(2n);
        
                    index = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_4]);
                    expect(index).to.be.equal(3n);
        
                    // Before user has token check
                    let has = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_2]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_3]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_4]);
                    expect(has).to.be.true;
        
                    // Before contract has token check
                    has = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_2]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_3]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_4]);
                    expect(has).to.be.true;
        
        
                    await WealthOSCore.write.withdrawToken([DEPLOYER_ADDRESS, [
                        {token: MOCK_TOKEN_ADDRESS, amount}
                    ]], {account: DEPLOYER_ADDRESS});
        
                    // --- BALANCE CHECK ---
        
                    const vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultTokenBalance).to.be.equal(0n);
        
                    const contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenBalance).to.be.equal(0n);
        
                    // --- TOKEN EXISTENCE CHECK ---
        
                    let afterContractTokenList = await WealthOSCore.read.getContractTokens();
                    let afterUserTokenList = await WealthOSCore.read.getVaultTokens([1n]);
        
                    // Convert to lower case
                    afterContractTokenList = afterContractTokenList.map(t => t.toLowerCase() as `0x${string}`);
                    afterUserTokenList = afterUserTokenList.map(t => t.toLowerCase() as `0x${string}`);
        
                    // After includes check
        
                    includes = afterContractTokenList.includes(MOCK_TOKEN_ADDRESS);
                    expect(includes).to.be.false;
        
                    includes = afterUserTokenList.includes(MOCK_TOKEN_ADDRESS);
                    expect(includes).to.be.false;
        
                    // After user token index check (MOCK TOKEN INDEX SHOULD BE 0 BECAUSE IT HAS BEEN RESETTED AND MOCK TOKEN 4 SHOULD BE 0 INDEX BECAUSE IT WAS AT LAST INDEX. THEY SWAPPED WHEN BALANCE OF FIRST TOKEN HIT 0)
        
                    index = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS]);
                    expect(index).to.be.equal(0n);
        
                    index = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_2]);
                    expect(index).to.be.equal(1n);
        
                    index = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_3]);
                    expect(index).to.be.equal(2n);
        
                    index = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_4]);
                    expect(index).to.be.equal(0n);
        
                    // After contract token index check (MOCK TOKEN INDEX SHOULD BE 0 BECAUSE IT HAS BEEN RESETTED MOCK TOKEN 4 SHOULD BE 0 INDEX BECAUSE IT WAS AT LAST INDEX. THEY SWAPPED WHEN BALANCE OF FIRST TOKEN HIT 0)
                    index = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS]);
                    expect(index).to.be.equal(0n);  
        
                    index = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_2]);
                    expect(index).to.be.equal(1n);
        
                    index = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_3]);
                    expect(index).to.be.equal(2n);
        
                    index = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_4]);
                    expect(index).to.be.equal(0n);
        
                    // After user has token check
                    has = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS]);
                    expect(has).to.be.false;
        
                    has = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_2]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_3]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS_4]);
                    expect(has).to.be.true;
                    
                    // After contract has token check
                    has = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS]);
                    expect(has).to.be.false;
        
                    has = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_2]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_3]);
                    expect(has).to.be.true;
        
                    has = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS_4]);
                    expect(has).to.be.true;
                })
        
                it('Should withdraw native token from WealthOSCore with correct variables', async () => {
                    const balance_before_withdraw = await getBalance(DEPLOYER_ADDRESS);
        
                    const amount = parseEther('10');
                    const txHash = await WealthOSCore.write.withdrawNative([DEPLOYER_ADDRESS, amount]);
                    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
                    const gas_cost = receipt.gasUsed * receipt.effectiveGasPrice;
                    
                    const balance_after_withdraw = await getBalance(DEPLOYER_ADDRESS);
        
                    expect(balance_before_withdraw).to.be.equal((balance_after_withdraw - amount) + gas_cost);
                    
                    const vaultNativeBalance = await WealthOSCore.read.vaultNativeBalance([1n]);
                    expect(vaultNativeBalance).to.be.equal(parseEther('90'));
        
                    const contractNativeBalance = await WealthOSCore.read.contractNativeBalance();
                    expect(contractNativeBalance).to.be.equal(parseEther('90'));
                })
        
                it('Should revert if amount is zero while withdrawing ERC20 token from WealthOSCore', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.withdrawToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount: 0n}]])
                    } catch (err: any) {
                        if(err.details.includes('ZeroAmount')) {
                            reverted = true;
                        }
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
        
                it('Should revert if ERC20 token address is zero address while withdrawing ERC20 token from WealthOSCore', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.withdrawToken([DEPLOYER_ADDRESS, [{token: zeroAddress, amount: 1n}]])
                    } catch (err: any) {
                        if(err.details.includes('ZeroAddress')) {
                            reverted = true;
                        }
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
        
                it('Should remintvert if ERC20 token balance of user less than amount while withdrawing ERC20 token from WealthOSCore', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.withdrawToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount: 101n}]])
                    } catch (err: any) {
                        if(err.details.includes('InsufficientBalance')) {
                            reverted = true;
                        }
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
        
                it('Should revert if ERC20 token balance of user less than amount while withdrawing ERC20 token from WealthOSCore', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.withdrawToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount: 101n}]])
                    } catch (err: any) {
                        if(err.details.includes('InsufficientBalance')) {
                            reverted = true;
                        }
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
        
                it('Should revert if amount is zero while withdrawing native token from WealthOSCore', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.withdrawNative([DEPLOYER_ADDRESS, 0n])
                    } catch (err: any) {
                        if(err.details.includes('ZeroAmount')) {
                            reverted = true;
                        }
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
        
                it('Should revert if native token balance of user less than amount while withdrawing native token from WealthOSCore', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.withdrawNative([DEPLOYER_ADDRESS, parseEther('101')])
                    } catch (err: any) {
                        if(err.details.includes('InsufficientBalance')) {
                            reverted = true;
                        }
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })
    
            describe('Detailed Index Assignment Test', async () => {
                const amount = 1n;
                before(async () => {
                    // Deploy 
                    MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', 100n]);
                    MockToken2 = await viem.deployContract('MockToken', ['Diamond', 'DIA', 100n]);
                    MockToken3 = await viem.deployContract('MockToken', ['Emerald', 'EM', 100n]);
                    MockToken4 = await viem.deployContract('MockToken', ['OIL', 'OIL', 100n]);
                    MockToken5 = await viem.deployContract('MockToken', ['Promethium', 'PM', 100n]);
                    MockToken6 = await viem.deployContract('MockToken', ['Terbium', 'TB', 100n]);
    
                    const MockTokens = [MockToken, MockToken2, MockToken3, MockToken4, MockToken5, MockToken6] 
    
                    MOCK_TOKEN_ADDRESS = MockToken.address;
                    MOCK_TOKEN_ADDRESS_2 = MockToken2.address;
                    MOCK_TOKEN_ADDRESS_3 = MockToken3.address;
                    MOCK_TOKEN_ADDRESS_4 = MockToken4.address;
                    MOCK_TOKEN_ADDRESS_5 = MockToken5.address;
                    MOCK_TOKEN_ADDRESS_6 = MockToken6.address;
                    MOCK_TOKENS = [MOCK_TOKEN_ADDRESS, MOCK_TOKEN_ADDRESS_2, MOCK_TOKEN_ADDRESS_3, MOCK_TOKEN_ADDRESS_4, MOCK_TOKEN_ADDRESS_5, MOCK_TOKEN_ADDRESS_6];
    
                    WealthOSCore = await viem.deployContract('WealthOSCore');
                    await WealthOSCore.write.createVault([USER_ADDRESS], {account: USER_ADDRESS})
                    await WealthOSCore.write.createVault([USER_ADDRESS_2], {account: USER_ADDRESS_2})
    
                    CORE_ADDRESS = WealthOSCore.address;
                    const USER_ADDRESSES = [USER_ADDRESS, USER_ADDRESS_2];
                    for (let t of MockTokens) {
                        for (let u of USER_ADDRESSES) {
                            await t.write.mint([10000n], { account: u});
                            await t.write.approve([CORE_ADDRESS , 10000n], { account: u});
                        }
                    }
    
                    await WealthOSCore.write.depositToken([USER_ADDRESS, [ // Contract index - User index
                        {token: MOCK_TOKEN_ADDRESS_2, amount}, // 0 - 0
                        {token: MOCK_TOKEN_ADDRESS, amount}, //   1 - 1
                        {token: MOCK_TOKEN_ADDRESS_3, amount}, // 2 - 2
                    ]], {account: USER_ADDRESS});
                    
                    await WealthOSCore.write.depositToken([USER_ADDRESS_2, [
                        {token: MOCK_TOKEN_ADDRESS_3, amount}, // 2 - 0 
                        {token: MOCK_TOKEN_ADDRESS_2, amount}, // 0 - 1
                    ]], {account: USER_ADDRESS_2});
    
                    await WealthOSCore.write.depositToken([USER_ADDRESS, [
                        {token: MOCK_TOKEN_ADDRESS_4, amount}, // 3 - 3
                    ]], {account: USER_ADDRESS});
    
                    await WealthOSCore.write.depositToken([USER_ADDRESS_2, [
                        {token: MOCK_TOKEN_ADDRESS_6, amount}, // 4 - 2
                        {token: MOCK_TOKEN_ADDRESS_5, amount}, // 5 - 3
                        {token: MOCK_TOKEN_ADDRESS_4, amount}, // 3 - 4
                    ]], {account: USER_ADDRESS_2});
                })
    
                // --- LIST ---
                // CONTRACT LIST 
                // MOCK_TOKEN_ADDRESS_2 => 0
                // MOCK_TOKEN_ADDRESS   => 1
                // MOCK_TOKEN_ADDRESS_3 => 2
                // MOCK_TOKEN_ADDRESS_4 => 3
                // MOCK_TOKEN_ADDRESS_6 => 4
                // MOCK_TOKEN_ADDRESS_5 => 5
    
                // USER LIST
                // MOCK_TOKEN_ADDRESS_2 => 0
                // MOCK_TOKEN_ADDRESS => 1
                // MOCK_TOKEN_ADDRESS_3 => 2
                // MOCK_TOKEN_ADDRESS_4 => 3
    
                // USER 2 LIST
                // MOCK_TOKEN_ADDRESS_3 => 0
                // MOCK_TOKEN_ADDRESS_2 => 1
                // MOCK_TOKEN_ADDRESS_6 => 2
                // MOCK_TOKEN_ADDRESS_5 => 3
                // MOCK_TOKEN_ADDRESS_4 => 4
    
                // --- UPDATES ---
                // MOCK_TOKEN_ADDRESS_6 REMOVED
                // CONTRACT LIST > MOCK_TOKEN_ADDRESS_5 => 4
                // USER 2 LIST > MOCK_TOKEN_ADDRESS_4 => 2
                
                it('Should remove MOCK_TOKEN_ADDRESS_6 of USER 2 ', async () => {
                    await WealthOSCore.write.withdrawToken([USER_ADDRESS_2, [
                        {token: MOCK_TOKEN_ADDRESS_6, amount}
                    ]], {account: USER_ADDRESS_2})
    
                    const newContractIndexOf_5 = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_5]);
                    expect(newContractIndexOf_5).to.be.equal(4n);
    
                    const newUser2IndexOf_4 = await WealthOSCore.read.vaultTokenIndex([2n, MOCK_TOKEN_ADDRESS_4]);
                    expect(newUser2IndexOf_4).to.be.equal(2n);
                })
    
                // --- LIST ---
                // CONTRACT LIST 
                // MOCK_TOKEN_ADDRESS_2 => 0
                // MOCK_TOKEN_ADDRESS   => 1
                // MOCK_TOKEN_ADDRESS_3 => 2
                // MOCK_TOKEN_ADDRESS_4 => 3
                // MOCK_TOKEN_ADDRESS_5 => 4
    
                // USER 
                // MOCK_TOKEN_ADDRESS_2 => 0
                // MOCK_TOKEN_ADDRESS => 1
                // MOCK_TOKEN_ADDRESS_3 => 2
                // MOCK_TOKEN_ADDRESS_4 => 3
    
                // USER 2
                // MOCK_TOKEN_ADDRESS_3 => 0
                // MOCK_TOKEN_ADDRESS_2 => 1
                // MOCK_TOKEN_ADDRESS_4 => 2
                // MOCK_TOKEN_ADDRESS_5 => 3
    
                // --- UPDATES ---
                // MOCK_TOKEN_ADDRESS_3 REMOVED FROM USER
                // USER LIST > MOCK_TOKEN_ADDRESS_4 => 2
    
                it('Should remove MOCK_TOKEN_ADDRESS_3 of USER ', async () => {
                    await WealthOSCore.write.withdrawToken([USER_ADDRESS, [
                        {token: MOCK_TOKEN_ADDRESS_3, amount}
                    ]], {account: USER_ADDRESS})
    
                    const newContractIndexOf_5 = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_5]);
                    expect(newContractIndexOf_5).to.be.equal(4n);
    
                    const newUserIndexOf_4 = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_4]);
                    expect(newUserIndexOf_4).to.be.equal(2n);
                })
    
                // --- LIST ---
                // CONTRACT LIST 
                // MOCK_TOKEN_ADDRESS_2 => 0
                // MOCK_TOKEN_ADDRESS   => 1
                // MOCK_TOKEN_ADDRESS_3 => 2
                // MOCK_TOKEN_ADDRESS_4 => 3
                // MOCK_TOKEN_ADDRESS_5 => 4
    
                // USER 
                // MOCK_TOKEN_ADDRESS_2 => 0
                // MOCK_TOKEN_ADDRESS => 1
                // MOCK_TOKEN_ADDRESS_4 => 2
    
                // USER 2
                // MOCK_TOKEN_ADDRESS_3 => 0
                // MOCK_TOKEN_ADDRESS_2 => 1
                // MOCK_TOKEN_ADDRESS_4 => 2
                // MOCK_TOKEN_ADDRESS_5 => 3
    
                // --- UPDATES ---
                // MOCK_TOKEN_ADDRESS_4 REMOVED FROM USER AND USER 2
                // USER 2 LIST > MOCK_TOKEN_ADDRESS_5 => 2
    
                it('Should remove MOCK_TOKEN_ADDRESS_4 from both USER and USER 2 ', async () => {
                    await WealthOSCore.write.withdrawToken([USER_ADDRESS, [
                        {token: MOCK_TOKEN_ADDRESS_4, amount}
                    ]], {account: USER_ADDRESS})
    
                    await WealthOSCore.write.withdrawToken([USER_ADDRESS_2, [
                        {token: MOCK_TOKEN_ADDRESS_4, amount}
                    ]], {account: USER_ADDRESS_2})
    
                    const newContractIndexOf_5 = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_5]);
                    expect(newContractIndexOf_5).to.be.equal(3n);
    
                    const newUser2IndexOf_5 = await WealthOSCore.read.vaultTokenIndex([2n, MOCK_TOKEN_ADDRESS_5]);
                    expect(newUser2IndexOf_5).to.be.equal(2n);
                })
    
                // --- LIST ---
                // CONTRACT LIST 
                // MOCK_TOKEN_ADDRESS_2 => 0
                // MOCK_TOKEN_ADDRESS   => 1
                // MOCK_TOKEN_ADDRESS_3 => 2
                // MOCK_TOKEN_ADDRESS_5 => 3
    
                // USER 
                // MOCK_TOKEN_ADDRESS_2 => 0
                // MOCK_TOKEN_ADDRESS => 1
    
                // USER 2
                // MOCK_TOKEN_ADDRESS_3 => 0
                // MOCK_TOKEN_ADDRESS_2 => 1
                // MOCK_TOKEN_ADDRESS_5 => 2
    
                // --- UPDATES ---
                // MOCK_TOKEN_ADDRESS REMOVED FROM USER
                // USER LIST > MOCK_TOKEN_ADDRESS_5 => 1
    
                it('Should remove MOCK_TOKEN_ADDRESS from USER', async () => {
                    await WealthOSCore.write.withdrawToken([USER_ADDRESS, [
                        {token: MOCK_TOKEN_ADDRESS, amount}
                    ]], {account: USER_ADDRESS})
    
                    const newContractIndexOf_5 = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_5]);
                    expect(newContractIndexOf_5).to.be.equal(1n);
                })
            })
        })
    })

    describe('Module Authorization', async () => {
        beforeEach(async () => {
            WealthOSCoreImp = await viem.deployContract('WealthOSCore');
            Proxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '' as any]);
            WealthOSCore = await viem.getContractAt('WealthOSCore', Proxy.address);
            CORE_ADDRESS = WealthOSCore.address;
            await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);
            await WealthOSCore.write.createVault([DEPLOYER_ADDRESS]);
        })

        describe('Owner', async () => {
            it('Should owner authroize module', async () => {
                // Not authrorized
                let isAuthorized = await WealthOSCore.read.authorizedModules([MOCK_MODULE_ADDRESS]);
                expect(isAuthorized).to.be.false;
                
                // Authorize module
                await WealthOSCore.write.authorizeModule([MOCK_MODULE_ADDRESS]);
    
                // Authorized
                isAuthorized = await WealthOSCore.read.authorizedModules([MOCK_MODULE_ADDRESS]);
                expect(isAuthorized).to.be.true;
                
            })
    
            it('Should owner revoke module', async () => {
                // Authorize module
                await WealthOSCore.write.authorizeModule([MOCK_MODULE_ADDRESS]);
    
                // Authorized
                let isAuthorized = await WealthOSCore.read.authorizedModules([MOCK_MODULE_ADDRESS]);
                expect(isAuthorized).to.be.true;
    
                // Revoke module
                await WealthOSCore.write.revokeModule([MOCK_MODULE_ADDRESS]);
    
                // Unauthorized
                isAuthorized = await WealthOSCore.read.authorizedModules([MOCK_MODULE_ADDRESS]);
                expect(isAuthorized).to.be.false;
            })

            it('Should revert if not owner', async () => {
                let reverted = false;
                try {
                    await WealthOSCore.write.authorizeModule([MOCK_MODULE_ADDRESS], {account: USER_ADDRESS});

                } catch (err: any) {
                    if (err.details.includes('OwnableUnauthorizedAccount')) reverted = true;
                } finally {
                    expect(reverted).to.be.true;
                }

                reverted = false;
                try {
                    await WealthOSCore.write.revokeModule([MOCK_MODULE_ADDRESS],  {account: USER_ADDRESS});
                } catch (err: any) {
                    if (err.details.includes('OwnableUnauthorizedAccount')) reverted = true;
                } finally {
                    expect(reverted).to.be.true;
                }
            })

            it('Should revert if address is zero', async () => {
                let reverted = false;
                try {
                    await WealthOSCore.write.authorizeModule([zeroAddress]);
                } catch (err: any) {
                    if (err.details.includes('ZeroAddress')) reverted = true;
                } finally {
                    expect(reverted).to.be.true;
                }

                reverted = false;
                try {
                    await WealthOSCore.write.revokeModule([zeroAddress]);
                } catch (err: any) {
                    if (err.details.includes('ZeroAddress')) reverted = true
                } finally {
                    expect(reverted).to.be.true;
                }
            })
        })

        describe('User', async () => {
            beforeEach(async () => {
                await WealthOSCore.write.authorizeModule([MOCK_MODULE_ADDRESS]);
            })

            it('Should user authorize module for vault', async () => {
                // Not authrorized
                let isAuthorized = await WealthOSCore.read.vaultAuthorizedModules([1n, MOCK_MODULE_ADDRESS]);
                expect(isAuthorized).to.be.false;
                
                // Authorize module
                await WealthOSCore.write.authorizeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);
    
                // Authorized
                isAuthorized = await WealthOSCore.read.vaultAuthorizedModules([1n, MOCK_MODULE_ADDRESS]);
                expect(isAuthorized).to.be.true;
            })
    
            it('Should user revoke module for vault', async () => {
                 // Authorize module
                await WealthOSCore.write.authorizeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);
    
                // Authorized
                let isAuthorized = await WealthOSCore.read.vaultAuthorizedModules([1n, MOCK_MODULE_ADDRESS]);
                expect(isAuthorized).to.be.true;
    
                // Revoke module
                await WealthOSCore.write.revokeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);
    
                // Unauthorized
                isAuthorized = await WealthOSCore.read.vaultAuthorizedModules([1n, MOCK_MODULE_ADDRESS]);
                expect(isAuthorized).to.be.false;
            })

            it('Should revert if zero address', async () => {
                let reverted = false;
                try {
                    await WealthOSCore.write.authorizeModuleForVault([DEPLOYER_ADDRESS, zeroAddress]);
                } catch (err: any) {
                    if (err.details.includes('ZeroAddress')) reverted = true;
                } finally {
                    expect(reverted).to.be.true;
                }

                reverted = false;
                try {
                    await WealthOSCore.write.revokeModuleForVault([DEPLOYER_ADDRESS, zeroAddress]);
                } catch (err: any) {
                    if (err.details.includes('ZeroAddress')) reverted = true
                } finally {
                    expect(reverted).to.be.true;
                }
            })

            it('Should revert if not authorized module by contract', async () => {
                await WealthOSCore.write.revokeModule([MOCK_MODULE_ADDRESS]);

                let reverted = false;
                try {
                    await WealthOSCore.write.authorizeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);
                } catch (err: any) {
                    if (err.details.includes('0x584b7e71')) reverted = true;
                } finally {
                    expect(reverted).to.be.true;
                }

                reverted = false;
                try {
                    await WealthOSCore.write.revokeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);
                } catch (err: any) {
                    if (err.details.includes('0x584b7e71')) reverted = true
                } finally {
                    expect(reverted).to.be.true;
                }
            })
        })

    })

    describe('Module ERC20 & Native', async () => {
        const amount = 100n;
        const parsed_amount = parseEther('100');

        beforeEach(async () => {
            // Deployments
            MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', amount]);
            MockToken2 = await viem.deployContract('MockToken', ['Diamond', 'DIA', amount]);
            MockToken3 = await viem.deployContract('MockToken', ['Emerald', 'EM', amount]);
            MOCK_TOKEN_ADDRESS = MockToken.address;
            MOCK_TOKEN_ADDRESS_2 = MockToken2.address;
            MOCK_TOKEN_ADDRESS_3 = MockToken3.address;

            WealthOSCoreImp = await viem.deployContract('WealthOSCore');
            Proxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '' as any]);
            WealthOSCore = await viem.getContractAt('WealthOSCore', Proxy.address);
            CORE_ADDRESS = WealthOSCore.address;

            // Start contract
            await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);
            await WealthOSCore.write.createVault([DEPLOYER_ADDRESS])

            // Send approval
            await MockToken.write.approve([CORE_ADDRESS, amount])
            await MockToken2.write.approve([CORE_ADDRESS, amount])
            await MockToken3.write.approve([CORE_ADDRESS, amount])

            // Deposit token
            await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS, amount}]])
            await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS_2, amount}]])
            await WealthOSCore.write.depositToken([DEPLOYER_ADDRESS, [{token: MOCK_TOKEN_ADDRESS_3, amount: amount}]])

            // Deposit native
            await WealthOSCore.write.depositNative({value: parsed_amount});

            // Authorize module
            await WealthOSCore.write.authorizeModule([MOCK_MODULE_ADDRESS]);
            await WealthOSCore.write.authorizeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);
        })

        describe('Withdraw', async () => {

            describe('ERC20 Token', async () => {
                it('Should module withdraw ERC20 token with correct variables', async () => {
                    // --- CONTRACT CHECKS ---
                    let contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenBalance).to.be.equal(amount);
        
                    let contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS]);
                    expect(contractHasToken).to.be.true;
        
                    let contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenIndex).to.be.equal(0n);
        
                    // --- VAULT CHECK --- 
                    let vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultTokenBalance).to.be.equal(amount)
        
                    let vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultHasToken).to.be.true;
        
                    let vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenIndex).to.be.equal(0n);
        
                    // Module withdraws token
                    await WealthOSCore.write.moduleWithdrawToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount, },]], {account: MOCK_MODULE_ADDRESS})
        
                    // Check balance of module
                    let balanceOf = await MockToken.read.balanceOf([MOCK_MODULE_ADDRESS]);
                    expect(balanceOf).to.be.equal(amount);
        
                     // --- CONTRACT CHECKS ---
                    contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenBalance).to.be.equal(0n);
        
                    contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS]);
                    expect(contractHasToken).to.be.false;
        
                    contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_3]);
                    expect(contractTokenIndex).to.be.equal(0n);
        
                    // --- VAULT CHECK --- 
                    vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultTokenBalance).to.be.equal(0n)
        
                    vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultHasToken).to.be.false;
        
                    vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_3]);
                    expect(contractTokenIndex).to.be.equal(0n);
                })

                it('Should revert if module is not authorized', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.revokeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);     
                        await WealthOSCore.write.moduleWithdrawToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount, },]], {account: MOCK_MODULE_ADDRESS})

                    } catch (err: any) {
                        if(err.details.includes('UnauthorizedModule')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user address is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawToken([[{user: zeroAddress, token: MOCK_TOKEN_ADDRESS, amount, },]], {account: MOCK_MODULE_ADDRESS})

                    } catch (err: any) {
                        if(err.details.includes('ZeroAddress')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if token address is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawToken([[{user: DEPLOYER_ADDRESS, token: zeroAddress, amount, },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAddress')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if amount is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount: 0n, },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAmount')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user is no member of a vault', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawToken([[{user: USER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount: 0n, },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('UserIsNotMemberOfAVault')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user has no enough balance', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount: amount * 2n, },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('InsufficientBalance')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if module not authorized by user', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.revokeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);
                        await WealthOSCore.write.moduleWithdrawToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount, },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('UnauthorizedModuleByUser')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })
            
            describe('Native Token', async () => {
                it('Should module withdraw native token', async () => {
                    let balance_before_withdraw = await publicClient.getBalance({address: MOCK_MODULE_ADDRESS});
    
                    // --- CONTRACT CHECKS ---
                    let contractNativeBalance = await WealthOSCore.read.contractNativeBalance();
                    expect(contractNativeBalance).to.be.equal(parsed_amount);
        
                    // --- VAULT CHECK --- 
                    let vaultNativeBalance = await WealthOSCore.read.vaultNativeBalance([1n]);
                    expect(vaultNativeBalance).to.be.equal(parsed_amount)
        
                    // Module withdraws native
                    const txHash = await WealthOSCore.write.moduleWithdrawNative([[{user: DEPLOYER_ADDRESS, amount: parsed_amount}]], {account: MOCK_MODULE_ADDRESS})
                    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
                    const gas_cost = receipt.gasUsed * receipt.effectiveGasPrice;
        
                    // Check native balance of module
                    const balance_after_withdraw = await publicClient.getBalance({address: MOCK_MODULE_ADDRESS});
                    const expectedBalance = balance_before_withdraw + parsed_amount;
                    expect(balance_after_withdraw + gas_cost).to.equal(expectedBalance);
    
                     // --- CONTRACT CHECKS ---
                    contractNativeBalance = await WealthOSCore.read.contractNativeBalance();
                    expect(contractNativeBalance).to.be.equal(0n);
        
                    // --- VAULT CHECK --- 
                    vaultNativeBalance = await WealthOSCore.read.vaultNativeBalance([1n]);
                    expect(vaultNativeBalance).to.be.equal(0n)
                })

                it('Should revert if module is not authorized', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.revokeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);     
                        await WealthOSCore.write.moduleWithdrawNative([[{user: DEPLOYER_ADDRESS, amount },]], {account: MOCK_MODULE_ADDRESS})

                    } catch (err: any) {
                        if(err.details.includes('UnauthorizedModule')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user address is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawNative([[{user: zeroAddress, amount },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAddress')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if amount is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawNative([[{user: DEPLOYER_ADDRESS, amount: 0n },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAmount')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user is no member of a vault', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawNative([[{user: USER_ADDRESS, amount },]], {account: MOCK_MODULE_ADDRESS})

                    } catch (err: any) {
                        if(err.details.includes('UserIsNotMemberOfAVault')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }                   
                })

                it('Should revert if module not authorized by user', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.revokeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);     
                        await WealthOSCore.write.moduleWithdrawNative([[{user: DEPLOYER_ADDRESS, amount },]], {account: MOCK_MODULE_ADDRESS})

                    } catch (err: any) {
                        if(err.details.includes('UnauthorizedModule')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user has no enough balance', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleWithdrawNative([[{user: DEPLOYER_ADDRESS, amount: parsed_amount * 2n },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('InsufficientBalance')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })
        })

        describe('Deposit', async () => {
            beforeEach(async () => {
                await WealthOSCore.write.moduleWithdrawToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount, },]], {account: MOCK_MODULE_ADDRESS})
                await WealthOSCore.write.moduleWithdrawNative([[{user: DEPLOYER_ADDRESS, amount: parsed_amount}]], {account: MOCK_MODULE_ADDRESS})
                await MockToken.write.approve([CORE_ADDRESS, amount], {account: MOCK_MODULE_ADDRESS});
                await MockToken2.write.approve([CORE_ADDRESS, amount], {account: MOCK_MODULE_ADDRESS});
                await MockToken3.write.approve([CORE_ADDRESS, amount], {account: MOCK_MODULE_ADDRESS});
            })
            
            describe('ERC20 Token', async () => {
                it('Should module deposit ERC20 token with correct variables', async () => {
                     // --- CONTRACT CHECKS ---
                    let contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenBalance).to.be.equal(0n);
        
                    let contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS]);
                    expect(contractHasToken).to.be.false;
        
                    let contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS_3]);
                    expect(contractTokenIndex).to.be.equal(0n);
    
                    // --- VAULT CHECK --- 
                    let vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultTokenBalance).to.be.equal(0n)
        
                    let vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultHasToken).to.be.false;
        
                    let vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS_3]);
                    expect(contractTokenIndex).to.be.equal(0n);
    
                    await WealthOSCore.write.moduleDepositToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount, },]], {account: MOCK_MODULE_ADDRESS})
    
                    contractTokenBalance = await WealthOSCore.read.contractTokenBalance([MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenBalance).to.be.equal(amount);
        
                    contractHasToken = await WealthOSCore.read.contractHasToken([MOCK_TOKEN_ADDRESS]);
                    expect(contractHasToken).to.be.true;
        
                    contractTokenIndex = await WealthOSCore.read.contractTokenIndex([MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenIndex).to.be.equal(2n);
    
                    // --- VAULT CHECK --- 
                    vaultTokenBalance = await WealthOSCore.read.vaultTokenBalance([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultTokenBalance).to.be.equal(amount)
        
                    vaultHasToken = await WealthOSCore.read.vaultHasToken([1n, MOCK_TOKEN_ADDRESS]);
                    expect(vaultHasToken).to.be.true;
        
                    vaultTokenIndex = await WealthOSCore.read.vaultTokenIndex([1n, MOCK_TOKEN_ADDRESS]);
                    expect(contractTokenIndex).to.be.equal(2n);
                })

                it('Should revert if module is not authorized', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.revokeModule([MOCK_MODULE_ADDRESS]);     
                        await WealthOSCore.write.moduleDepositToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount, }]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        const decoded = decodeErrorResult({
                            abi: abi.abi,
                            data: '0x584b7e71'
                        }) 

                        if(decoded.errorName.includes('UnauthorizedModule')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user address is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleDepositToken([[{user: zeroAddress, token: MOCK_TOKEN_ADDRESS, amount, }]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAddress')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if token address is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleDepositToken([[{user: DEPLOYER_ADDRESS, token: zeroAddress, amount, },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAddress')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if amount is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleDepositToken([[{user: DEPLOYER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount: 0n, },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAmount')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user is no member of a vault', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleDepositToken([[{user: USER_ADDRESS, token: MOCK_TOKEN_ADDRESS, amount, },]], {account: MOCK_MODULE_ADDRESS})
                    } catch (err: any) {
                        if(err.details.includes('UserIsNotMemberOfAVault')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })
            })

            describe('Native Token', async () => {
                it('Should module deposit native token with correct variables', async () => {
                    let balance_before_deposit = await publicClient.getBalance({address: CORE_ADDRESS});
    
                    // --- CONTRACT CHECKS ---
                    let contractNativeBalance = await WealthOSCore.read.contractNativeBalance();
                    expect(contractNativeBalance).to.be.equal(0n);
        
                    // --- VAULT CHECK --- 
                    let vaultNativeBalance = await WealthOSCore.read.vaultNativeBalance([1n]);
                    expect(vaultNativeBalance).to.be.equal(0n)
        
                    // Module withdraws native
                    const txHash = await WealthOSCore.write.moduleDepositNative([[{user: DEPLOYER_ADDRESS, amount: parsed_amount}], parsed_amount], {account: MOCK_MODULE_ADDRESS, value: parsed_amount})
                    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
                    const gas_cost = receipt.gasUsed * receipt.effectiveGasPrice;
        
                    // Check native balance of module
                    const balance_after_deposit = await publicClient.getBalance({address: CORE_ADDRESS});
                    const expectedBalance = balance_before_deposit + parsed_amount;
                    expect(balance_after_deposit).to.equal(expectedBalance);
    
                     // --- CONTRACT CHECKS ---
                    contractNativeBalance = await WealthOSCore.read.contractNativeBalance();
                    expect(contractNativeBalance).to.be.equal(parsed_amount);
        
                    // --- VAULT CHECK --- 
                    vaultNativeBalance = await WealthOSCore.read.vaultNativeBalance([1n]);
                    expect(vaultNativeBalance).to.be.equal(parsed_amount)
                })

                it('Should revert if module is not authorized', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.revokeModuleForVault([DEPLOYER_ADDRESS, MOCK_MODULE_ADDRESS]);     
                        await WealthOSCore.write.moduleDepositNative([[{user: DEPLOYER_ADDRESS, amount: parsed_amount}], amount], {account: MOCK_MODULE_ADDRESS, value: parsed_amount})
                    } catch (err: any) {
                        const decoded = decodeErrorResult({
                            abi: abi.abi,
                            data: '0x584b7e71'
                        }) 

                        if(decoded.errorName.includes('UnauthorizedModule')) reverted = true;    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user address is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleDepositNative([[{user: zeroAddress, amount: parsed_amount }], parsed_amount], {account: MOCK_MODULE_ADDRESS, value: parsed_amount})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAddress')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if amount is zero', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleDepositNative([[{user: DEPLOYER_ADDRESS, amount: 0n }], parsed_amount], {account: MOCK_MODULE_ADDRESS, value: parsed_amount})
                    } catch (err: any) {
                        if(err.details.includes('ZeroAmount')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }
                })

                it('Should revert if user is no member of a vault', async () => {
                    let reverted = false;
                    try {
                        await WealthOSCore.write.moduleDepositNative([[{user: USER_ADDRESS, amount: parsed_amount }], parsed_amount], {account: MOCK_MODULE_ADDRESS, value: parsed_amount})
                    } catch (err: any) {
                        if(err.details.includes('UserIsNotMemberOfAVault')) reverted = true;                    
                    } finally {
                        expect(reverted).to.be.true;
                    }                   
                })
            })
        })
    })

    describe('Servant Module', async () => {

        beforeEach(async () => {
            MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', 100n]);
            MOCK_TOKEN_ADDRESS = MockToken.address;

            WealthOSCoreImp = await viem.deployContract('WealthOSCore');
            Proxy = await viem.deployContract('ERC1967Proxy', [WealthOSCoreImp.address, '' as any]);
            WealthOSCore = await viem.getContractAt('WealthOSCore', Proxy.address);
            await WealthOSCore.write.initialize([DEPLOYER_ADDRESS, SERVANT_MODULE_ADDRESS]);
            CORE_ADDRESS = WealthOSCore.address;
            await WealthOSCore.write.setServantModule([SERVANT_MODULE_ADDRESS]);    
        })

        it('Should set servant module', async () => {
            await WealthOSCore.write.setServantModule([SERVANT_MODULE_ADDRESS]);    
        })

        it('Should only user or servant can use address of user', async () => {
            await WealthOSCore.write.approveVault([DEPLOYER_ADDRESS, 1n]);
            await WealthOSCore.write.approveVault([DEPLOYER_ADDRESS, 1n], {account: SERVANT_MODULE_ADDRESS});
        })

        it('Should revert if user gives another address', async () => {
            let reverted = false;
            try {
                await WealthOSCore.write.approveVault([DEPLOYER_ADDRESS, 1n], {account: USER_ADDRESS});
            } catch (err: any) {
                if (err.details.includes('0x7f2d38f8')) reverted = true;
            } finally{
                expect(reverted).to.be.true;
            }
        })
    })

})