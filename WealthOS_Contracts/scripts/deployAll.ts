import { network } from "hardhat";
const { viem } = await network.connect();

const deployAll = async () => {
    const ERC1967Proxy = "ERC1967Proxy";
    
    const walletClients = await viem.getWalletClients();
    const OWNER_ACCOUNT = '0xb60706F3B1c3cA291f49BE4a840314a92eEbb12d';
    const SERVANT_ACCOUNT = '0xb27924877CADCEdd2DE4fAf47F71ca50C55EC070';

    // ERC2771Forwarder
    const Forwarder = await viem.deployContract("WealthOSERC2771Forwarder", ['WealthOS-ERC2771Forwarder']);
    console.log(`Forwarder Address: ${Forwarder.address}`);

    console.log('-------------------------')

    // Servant Module
    const ServantImp = await viem.deployContract("WealthOSServantModule", [Forwarder.address]);
    console.log(`Servant Implementation Address: ${ServantImp.address}`);

    let Proxy = await viem.deployContract(ERC1967Proxy, [ServantImp.address, '0x']);
    const ServantProxy = await viem.getContractAt("WealthOSServantModule", Proxy.address);
    console.log(`Servant Proxy Address: ${ServantProxy.address}`);


    try {
        console.log(`--> Initializing ServantProxy with forwarder: ${Forwarder.address}`);
        const txHash = await ServantProxy.write.initialize([Forwarder.address, SERVANT_ACCOUNT]);
        console.log(`ServantProxy.initialize txHash: ${txHash}`);
    } catch (err) {
        console.error("❌ ServantProxy.initialize failed:", err);
    }

    const trustedForwarderOfServant = await ServantProxy.read.trustedForwarder();
    console.log(`Servant Proxy Trusted Forwarder: ${trustedForwarderOfServant}`);

    console.log('-------------------------')

    // WealthOS Core
    const WealthOSCoreImp = await viem.deployContract("WealthOSCore");
    console.log(`WealthOSCore Implementation Address: ${WealthOSCoreImp.address}`);

    Proxy = await viem.deployContract(ERC1967Proxy, [WealthOSCoreImp.address, '0x']);
    const WealthOSCoreProxy = await viem.getContractAt("WealthOSCore", Proxy.address);
    console.log(`WealthOSCore Proxy Address: ${WealthOSCoreProxy.address}`);

    try {
        console.log(`--> Initializing WealthOSCoreProxy, servant: ${ServantProxy.address}`);
        const txHash = await WealthOSCoreProxy.write.initialize([OWNER_ACCOUNT, ServantProxy.address]);
        console.log(`WealthOSCoreProxy.initialize txHash: ${txHash}`);
    } catch (err) {
        console.error("❌ WealthOSCoreProxy.initialize failed:", err);
    }
    
    console.log('-------------------------')

    // Scheduled Transfer Module
    const ScheduledTransferImp = await viem.deployContract("WealthOSScheduledTransferModule");
    console.log(`ScheduledTransfer Implementation Address: ${ScheduledTransferImp.address}`);

    Proxy = await viem.deployContract(ERC1967Proxy, [ScheduledTransferImp.address, '0x']);
    const ScheduledTransferProxy = await viem.getContractAt("WealthOSScheduledTransferModule", Proxy.address);
    console.log(`ScheduledTransfer Proxy Address: ${ScheduledTransferProxy.address}`);

    try {
        console.log(`--> Initializing ScheduledTransferProxy with core: ${WealthOSCoreProxy.address}, servant: ${ServantProxy.address}`);
        const txHash = await ScheduledTransferProxy.write.initialize([WealthOSCoreProxy.address, ServantProxy.address]);
        console.log(`ScheduledTransferProxy.initialize txHash: ${txHash}`);
    } catch (err) {
        console.error("❌ ScheduledTransferProxy.initialize failed:", err);
    }

};

deployAll()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Script crashed:", error);
        process.exit(1);
    });
