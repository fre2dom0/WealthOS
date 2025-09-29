import { expect } from "chai";
import { network } from "hardhat";
import { describe, it, before, beforeEach } from "node:test";
import { toFunctionSelector, encodeFunctionData, erc20Abi, decodeAbiParameters } from 'viem'

import { getContract, zeroAddress } from "viem";

describe('Servant Module', async () => {
    const { viem } = await network.connect();  

    const walletClients = await viem.getWalletClients();

    const [deployer, executor] = walletClients;
    const [DEPLOYER_ADDRESS, EXECUTOR_ADDRESS] = [deployer.account.address, executor.account.address];

    let MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', 100n]);

    let ServantForwarder = await viem.deployContract('WealthOSERC2771Forwarder');
    let ServantImp = await viem.deployContract('WealthOSServantModule', [ServantForwarder.address]);
    let proxy = await viem.deployContract('ERC1967Proxy', [
        ServantImp.address,
        '0x'
    ]); 
    let ServantProxy = await viem.getContractAt('WealthOSServantModule', proxy.address);
    await ServantProxy.write.initialize();

    const DEFAULT_ADMIN_ROLE = await ServantProxy.read.DEFAULT_ADMIN_ROLE();
    const SERVANT_ROLE = await ServantProxy.read.SERVANT_ROLE();

    beforeEach(async () => {
        // Deployment
        MockToken = await viem.deployContract('MockToken', ['Gold', 'XAU', 100n]);

        ServantForwarder = await viem.deployContract('WealthOSERC2771Forwarder');
        ServantImp = await viem.deployContract('WealthOSServantModule', [ServantForwarder.address]);
        proxy = await viem.deployContract('ERC1967Proxy', [
            ServantImp.address,
            '0x'
        ]);

        // Initialize
        ServantProxy = await viem.getContractAt('WealthOSServantModule', proxy.address);
        await ServantProxy.write.initialize();

        // Grant role
        await ServantProxy.write.grantRole([SERVANT_ROLE, EXECUTOR_ADDRESS]);
    }) 
    
    it('Initialize should work', async () => {
        const hasRole = await ServantProxy.read.hasRole([DEFAULT_ADMIN_ROLE, DEPLOYER_ADDRESS]);
        expect(hasRole).to.be.true;
    })

    describe('Authoritize Module', async () => {
        it('Deployer should authorize module', async () => {
            await ServantProxy.write.authorizeModule([[MockToken.address]]);
            const authrorized: boolean = await ServantProxy.read.authorizedModules([MockToken.address]);
            expect(authrorized).to.be.true;
        });

        it('Should revert if zero address', async () => {
            let reverted = false;
            try {
                await ServantProxy.write.authorizeModule([[zeroAddress]]);
            } catch (err: any) {
                if (err.details.includes('ZeroAddress')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        });
        it('Should revert if non deployer tries to authorize', async () => {
            let reverted = false;
            try {
                await ServantProxy.write.authorizeModule([[MockToken.address]], {account: EXECUTOR_ADDRESS});
            } catch (err: any) {
                if (err.details.includes('AccessControlUnauthorizedAccount')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        });
    })

    describe('Unauthorize Module', async () => {
        beforeEach(async () => {
            await ServantProxy.write.authorizeModule([[MockToken.address]]);
            const authrorized: boolean = await ServantProxy.read.authorizedModules([MockToken.address]);
            expect(authrorized).to.be.true;
        })

        it('Deployer should unauthorize module', async () => {
            await ServantProxy.write.unauthorizeModule([[MockToken.address]]);
            const authrorized: boolean = await ServantProxy.read.authorizedModules([MockToken.address]);
            expect(authrorized).to.be.false;
        });

        it('Should revert if zero address', async () => {
            let reverted = false;
            try {
                await ServantProxy.write.unauthorizeModule([[zeroAddress]]);
            } catch (err: any) {
                if (err.details.includes('ZeroAddress')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        });

        it('Should revert if non deployer tries to unauthorize', async () => {
            let reverted = false;
            try {
                await ServantProxy.write.unauthorizeModule([[MockToken.address]], {account: EXECUTOR_ADDRESS});
            } catch (err: any) {
                if (err.details.includes('AccessControlUnauthorizedAccount')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        });
    })

    describe('Approve', () => {
        it('User should approve without function selectors', async () => {
            let allFnsApproved = await ServantProxy.read.allFnsApproved([DEPLOYER_ADDRESS]);
            expect(allFnsApproved).to.be.false;

            let expiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(expiryTime).to.be.equal(0);

            await ServantProxy.write.approve([3600n, []]);
            allFnsApproved = await ServantProxy.read.allFnsApproved([DEPLOYER_ADDRESS]);
            expect(allFnsApproved).to.be.true;

            expiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(expiryTime).to.be.greaterThan(0);
        })
        
        it('User should approve with function selectors', async () => {
            const fnSelector = toFunctionSelector('function balanceOf(address account)')

            let expiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(expiryTime).to.be.equal(0);

            let allFnsApproved = await ServantProxy.read.allFnsApproved([DEPLOYER_ADDRESS]);
            expect(allFnsApproved).to.be.false;

            let isFnApproved = await ServantProxy.read.isFnApproved([DEPLOYER_ADDRESS, fnSelector]);
            expect(isFnApproved).to.be.false;

            await ServantProxy.write.approve([3600n, [fnSelector]]);

            expiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(expiryTime).to.be.greaterThan(0);

            allFnsApproved = await ServantProxy.read.allFnsApproved([DEPLOYER_ADDRESS]);
            expect(allFnsApproved).to.be.false;

            isFnApproved = await ServantProxy.read.isFnApproved([DEPLOYER_ADDRESS, fnSelector]);
            expect(isFnApproved).to.be.true;
        })
        
        it('User should approve function selectors without changing existing approval time by giving time 0', async () => {
            const fnSelector = toFunctionSelector('function balanceOf(address account)')

            let expiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(expiryTime).to.be.equal(0);

            let allFnsApproved = await ServantProxy.read.allFnsApproved([DEPLOYER_ADDRESS]);
            expect(allFnsApproved).to.be.false;

            let isFnApproved = await ServantProxy.read.isFnApproved([DEPLOYER_ADDRESS, fnSelector]);
            expect(isFnApproved).to.be.false;

            await ServantProxy.write.approve([3600n, []]);

            allFnsApproved = await ServantProxy.read.allFnsApproved([DEPLOYER_ADDRESS]);
            expect(allFnsApproved).to.be.true;

            expiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(expiryTime).to.be.greaterThan(0);

            await ServantProxy.write.approve([0n, [fnSelector]]);

            const unchangedExpiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(unchangedExpiryTime).to.be.equal(expiryTime);

            allFnsApproved = await ServantProxy.read.allFnsApproved([DEPLOYER_ADDRESS]);
            expect(allFnsApproved).to.be.false

            isFnApproved = await ServantProxy.read.isFnApproved([DEPLOYER_ADDRESS, fnSelector]);
            expect(isFnApproved).to.be.true;           
        })
    
        it('Should revert if time is not zero and time lesser than MIN_APPROVAL TIME or more than MAX_APPROVAL_TIME', async () => {
            let reverted = false;
            // Lesser than 
            try {
                await ServantProxy.write.approve([1n, []]);
            } catch (err: any) {
                if (err.details.includes('ApprovalTimeOutOfRange')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }

            reverted = false
            // More than
            try {
                await ServantProxy.write.approve([999999999999n, []]);
            } catch (err: any) {
                if (err.details.includes('ApprovalTimeOutOfRange')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if time is zero and there is no function selector ', async () => {
             let reverted = false;
            try {
                await ServantProxy.write.approve([0n, []]);
            } catch (err: any) {
                if (err.details.includes('CannotApproveIfTimeIsZeroWithoutFunctionSelectors')) reverted = true;
            } finally {
                expect(reverted).to.be.true;
            }
        })
    })

    describe('Revoke', () => {
        const fnSelector = toFunctionSelector('function balanceOf(address account)')

        beforeEach(async () => {
            await ServantProxy.write.approve([3600n, [fnSelector]]);
        })

        it('User should revoke', async () => {
            let expiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(expiryTime).to.be.greaterThan(0);

            await ServantProxy.write.revoke();

            expiryTime = Number(await ServantProxy.read.userApprovalExpiry([DEPLOYER_ADDRESS]));
            expect(expiryTime).to.be.equal(0);
        })

        it('User should revoke function selectors', async () => {
            let isFnApproved = await ServantProxy.read.isFnApproved([DEPLOYER_ADDRESS, fnSelector]);
            expect(isFnApproved).to.be.true;

            await ServantProxy.write.revokeFunctions([[fnSelector]]);

            isFnApproved = await ServantProxy.read.isFnApproved([DEPLOYER_ADDRESS, fnSelector]);
            expect(isFnApproved).to.be.false;
        })
    })    

    describe('Execute', () => {
        const fnSelector = toFunctionSelector('function balanceOf(address account)')
        const fnSelector2 = toFunctionSelector('transferFrom(address from, address to, uint256 value)')

        const encodedFn = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'balanceOf',
            args: [DEPLOYER_ADDRESS]
        })
        const encodedFn2 = encodeFunctionData({
            abi: erc20Abi,
            functionName: 'transferFrom',
            args: [DEPLOYER_ADDRESS, EXECUTOR_ADDRESS, 50n]
        })

        const invalidData = '0xdeadbeef';

        beforeEach(async () => {
            await ServantProxy.write.authorizeModule([[MockToken.address]]);
        })
        
        it('Servant Role should execute if all functions approved by user', async () => {
            await ServantProxy.write.approve([3600n, []]);
            
            const {result} = await ServantProxy.simulate.execute([DEPLOYER_ADDRESS, MockToken.address, encodedFn], {account: EXECUTOR_ADDRESS});
            const [balanceOf] = decodeAbiParameters(
                [{ type: 'uint256' }],
                result
            );
            
            expect(balanceOf).to.be.equal(100n);
        });  

        it('Servant Role should only execute if determined functions approved by user and used', async () => {
            await MockToken.write.approve([ServantProxy.address, 50n])

            let balanceOf = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
            expect(balanceOf).to.be.equal(100n);

            await ServantProxy.write.approve([3600n, [fnSelector2]]);
            await ServantProxy.write.execute([DEPLOYER_ADDRESS, MockToken.address, encodedFn2], {account: EXECUTOR_ADDRESS});

            balanceOf = await MockToken.read.balanceOf([DEPLOYER_ADDRESS]);
            expect(balanceOf).to.be.equal(50n);

            balanceOf = await MockToken.read.balanceOf([EXECUTOR_ADDRESS]);
            expect(balanceOf).to.be.equal(50n);

        });

        it('Should revert if approval expired', async () => {
            let reverted = false;
            try {
                await ServantProxy.write.revoke();
                await ServantProxy.simulate.execute([DEPLOYER_ADDRESS, MockToken.address, encodedFn], {account: EXECUTOR_ADDRESS});
            } catch (err: any) {
                if(err.details.includes('ApprovalExpired')) {
                    reverted = true;
                }
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if determined functions approved by user and used unapproved function on execution', async () => {
            let reverted = false;
            try {
                await ServantProxy.write.approve([3600n, [fnSelector]]);
                await ServantProxy.write.execute([DEPLOYER_ADDRESS, MockToken.address, encodedFn2], {account: EXECUTOR_ADDRESS});
            } catch (err: any) {
                if(err.details.includes('FunctionNotApproved')) {
                    reverted = true;
                }
            } finally {
                expect(reverted).to.be.true;
            }
        });

        it('Should revert if module is not authorized', async () => {
            await ServantProxy.write.unauthorizeModule([[MockToken.address]]);

            let reverted = false;
            try {
                await ServantProxy.write.approve([3600n, []]);
                await ServantProxy.write.execute([DEPLOYER_ADDRESS, MockToken.address, encodedFn], {account: EXECUTOR_ADDRESS});
            } catch (err: any) {
                if(err.details.includes('UnauthorizedModule')) {
                    reverted = true;
                }
            } finally {
                expect(reverted).to.be.true;
            }
        })

        it('Should revert if module call failured', async () => {
            let reverted = false;
            try {
                await ServantProxy.write.approve([3600n, []]);
                await ServantProxy.write.execute([DEPLOYER_ADDRESS, MockToken.address, invalidData], {account: EXECUTOR_ADDRESS});
            } catch (err: any) {
                if(err.details.includes('FunctionCallFailure')) {
                    reverted = true;
                }
            } finally {
                expect(reverted).to.be.true;
            }
        })

    })

});
