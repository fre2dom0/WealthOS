// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;


import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "../libraries/WealthOSLibrary.UserOperations.sol";
import "../libraries/WealthOSLibrary.ModuleOperations.sol";

import "../types/WealthOSTypes.sol";

/**
 * @title WealthOS Core
 * @author fre2dom0
 * @notice The core contract of WealthOS. Holds user tokens and manages modules.
 * @dev Uses UUPS proxy. Only authorized modules can spend tokens.
 */
contract WealthOSCore is Initializable, UUPSUpgradeable, OwnableUpgradeable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20; 

    uint256 private vaultId;
    WealthOSTypes.State private state;

    // ===============
    // CONTRACT-LEVEL
    // ===============

    /// @notice Returns the list of tokens held by the contract at a given index
    function contractTokens(uint256 index) external view returns (address) {
        return state.contractTokens[index];
    }

    function getContractTokens() external view returns (address[] memory) {
        return state.contractTokens;
    }

    /// @notice Returns the length of contractTokens array
    function contractTokensLength() external view returns (uint256) {
        return state.contractTokens.length;
    }

    /// @notice Returns the index of a token in contractTokens array
    function contractTokenIndex(address token) external view returns (uint256) {
        return state.contractTokenIndex[token];
    }

    /// @notice Returns whether the contract holds a given token
    function contractHasToken(address token) external view returns (bool) {
        return state.contractHasToken[token];
    }

    /// @notice Returns the ERC20 balance of the contract for a given token
    function contractTokenBalance(address token) external view returns (uint256) {
        return state.contractTokenBalance[token];
    }

    /// @notice Returns the native (ETH) balance of the contract
    function contractNativeBalance() external view returns (uint256) {
        return state.contractNativeBalance;
    }


    // ===========
    // VAULT-LEVEL
    // ===========

    function getVaultTokens(uint256 _vaultId) external view returns (address[] memory) {
        return state.vaultTokens[_vaultId];
    }

    /// @notice Returns the list of users in a vault at a given index
    function vaultMembers(uint256 _vaultId, uint256 index) external view returns (address) {
        return state.vaultMembers[_vaultId][index];
    }
    
    function getVaultMembers(uint256 _vaultId) external view returns (address[] memory) {
        return state.vaultMembers[_vaultId];
    }
    /// @notice Returns the number of members in a vault
    function vaultMembersLength(uint256 _vaultId) external view returns (uint256) {
        return state.vaultMembers[_vaultId].length;
    }

    /// @notice Returns the list of tokens in a vault at a given index
    function vaultTokens(uint256 _vaultId, uint256 index) external view returns (address) {
        return state.vaultTokens[_vaultId][index];
    }

    /// @notice Returns the number of tokens in a vault
    function vaultTokensLength(uint256 _vaultId) external view returns (uint256) {
        return state.vaultTokens[_vaultId].length;
    }

    /// @notice Returns the index of a token in a vault's token list
    function vaultTokenIndex(uint256 _vaultId, address token) external view returns (uint256) {
        return state.vaultTokenIndex[_vaultId][token];
    }

    /// @notice Returns whether a vault holds a given token
    function vaultHasToken(uint256 _vaultId, address token) external view returns (bool) {
        return state.vaultHasToken[_vaultId][token];
    }

    /// @notice Returns the ERC20 balance of a vault for a given token
    function vaultTokenBalance(uint256 _vaultId, address token) external view returns (uint256) {
        return state.vaultTokenBalance[_vaultId][token];
    }

    /// @notice Returns the native (ETH) balance of a vault
    function vaultNativeBalance(uint256 _vaultId) external view returns (uint256) {
        return state.vaultNativeBalance[_vaultId];
    }


    // =========
    // USER-LEVEL
    // =========

    /// @notice Returns the vault ID of a user
    function vaultOfUser(address user) external view returns (uint256) {
        return state.vaultOfUser[user];
    }

    /// @notice Returns the vault ID a user has approved to join
    function vaultApproval(address user) external view returns (uint256) {
        return state.vaultApproval[user];
    }


    // ==========
    // MODULES
    // ==========

    /// @notice Returns whether a module is globally authorized
    function authorizedModules(address module) external view returns (bool) {
        return state.authorizedModules[module];
    }

    /// @notice Returns whether a module is authorized by a specific vault
    function vaultAuthorizedModules(uint256 _vaultId, address module) external view returns (bool) {
        return state.vaultAuthorizedModules[_vaultId][module];
    }


    // ================
    // SERVANT MODULE
    // ================

    /// @notice Returns the address of the servant module
    function servantModule() external view returns (address) {
        return state.servantModule;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the contract
     */
    function initialize(address owner, address _servantModule) public initializer {
        __Ownable_init(owner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        state.servantModule = _servantModule;
        vaultId = 1;
    }

    // ------ //

    /**
     * @notice Modifier to allow only authorized modules
    */
    modifier onlyAuthorizedModule() {
        if (!state.authorizedModules[msg.sender]) revert WealthOSTypes.UnauthorizedModule();
        _;
    }
    
    /**
     * @notice Checks is sender user or servant else reverts
    */
    modifier onlyUserOrServant(address user) {
        bool isUser = (msg.sender == user);
        bool isServant = (msg.sender == state.servantModule);
        if (!isUser && !isServant) revert WealthOSTypes.OnlyUserOrServant();
        _;
    }

    modifier userShouldBeVaultMember(address user) {
        if (state.vaultOfUser[user] == 0) revert WealthOSTypes.UserIsNotMemberOfAVault();
        _;
    }

    modifier userShouldNotBeVaultMember(address user) {
        if (state.vaultOfUser[user] != 0) revert WealthOSTypes.UserIsMemberOfAVault();
        _;
    }

    function setServantModule(address module) external onlyOwner {
        state.servantModule = module;
    }

    /**
     * @notice Owner authorizes a module to interact with user funds
     * @param module The module address to authorize
     */
    function authorizeModule(address module) external onlyOwner {
        if (module == address(0)) revert WealthOSTypes.ZeroAddress();
        state.authorizedModules[module] = true;
        emit WealthOSTypes.ModuleAuthorized(module);
    }

    /**
     * @notice Owner revokes a module's authorization
     * @param module The module address to revoke
     */
    function revokeModule(address module) external onlyOwner {
        if (module == address(0)) revert WealthOSTypes.ZeroAddress();
        state.authorizedModules[module] = false;
        emit WealthOSTypes.ModuleRevoked(module);
    }

    /**
     * @notice User authorizes a module to withdraw their money from vault
     * @param module The module address to authorize
     */
    function authorizeModuleForVault(address user, address module) external onlyUserOrServant(user) userShouldBeVaultMember(user) {
        if (module == address(0)) revert WealthOSTypes.ZeroAddress();
        if (!state.authorizedModules[module]) revert WealthOSTypes.UnauthorizedModule();
        uint256 _vaultOfUser = state.vaultOfUser[user];
        state.vaultAuthorizedModules[_vaultOfUser][module] = true;
        emit WealthOSTypes.UserAuthorizedModule(user, module, block.timestamp);
    }

    /**
     * @notice User revokes authority of a module to withdraw their money from vault
     * @param module The module address to revoke
     */
    function revokeModuleForVault(address user, address module) external onlyUserOrServant(user) userShouldBeVaultMember(user) {
        if (module == address(0)) revert WealthOSTypes.ZeroAddress();
        if (!state.authorizedModules[module]) revert WealthOSTypes.UnauthorizedModule();
        uint256 _vaultOfUser = state.vaultOfUser[user];
        state.vaultAuthorizedModules[_vaultOfUser][module] = false;
        emit WealthOSTypes.UserRevokedModule(user, module, block.timestamp);
    }


    // ------------------------------------------------------------------------------ //

    function createVault(address user) external onlyUserOrServant(user) userShouldNotBeVaultMember(user) {
        state.vaultOfUser[user] = vaultId;
        state.vaultMembers[vaultId].push(user);
        vaultId++;
    }

    function addMembersToVault(address user, address[] calldata members) external onlyUserOrServant(user) userShouldBeVaultMember(user) {
        uint256 len = members.length;
        uint256 _vaultOfUser = state.vaultOfUser[user];

        if (len + state.vaultMembers[_vaultOfUser].length > WealthOSTypes.MAX_VAULT_MEMBER) revert WealthOSTypes.MaxVaultMemberOverflowed();
        for (uint256 i; i < len;) {
            address member = members[i];
            if (member == address(0)) revert WealthOSTypes.ZeroAddress();

            if (state.vaultOfUser[member] != 0) revert WealthOSTypes.UserIsMemberOfAVault();

            if (state.vaultApproval[member] != _vaultOfUser) revert WealthOSTypes.UserDidNotApproveTheVault();

            if (state.vaultMembers[_vaultOfUser].length + 1 > WealthOSTypes.MAX_VAULT_MEMBER) revert WealthOSTypes.MaxVaultMemberOverflowed();

            state.vaultMembers[_vaultOfUser].push(member);
            state.vaultOfUser[member] = _vaultOfUser;
            delete state.vaultApproval[member];

            unchecked {++i;}
        }
    }

    function removeMembersFromVault(address user, address[] calldata members) external onlyUserOrServant(user) userShouldBeVaultMember(user) {
        uint256 len = members.length;
        uint256 _vaultOfUser = state.vaultOfUser[user];
        if (state.vaultMembers[_vaultOfUser].length - len <= 0 ) revert WealthOSTypes.VaultShouldHaveAtLeastOneMember();
        for (uint256 i; i < len;) {
            address member = members[i];
            if (member == address(0)) revert WealthOSTypes.ZeroAddress();

            if (state.vaultOfUser[member] != _vaultOfUser) revert WealthOSTypes.UserIsMemberOfAVault();

            address[] storage _vaultMembers = state.vaultMembers[_vaultOfUser];
            uint256 vLen = _vaultMembers.length;
            for (uint j; j < vLen;) {
                if(_vaultMembers[j] == member) {
                    delete state.vaultOfUser[_vaultMembers[j]];
                    _vaultMembers[j] = _vaultMembers[vLen - 1];
                    _vaultMembers.pop();

                    break;
                }
                unchecked {++j;}
            }

            unchecked {++i;}
        }
    }

    function approveVault(address user, uint256 _vaultId) external onlyUserOrServant(user) userShouldNotBeVaultMember(user) {
        state.vaultApproval[user] = _vaultId;
    }

    // ------------------------------------------------------------------------------ //
    
    /**
     * @notice User deposits ERC20 tokens into the vault
     * @param datas The TokenData struct array
    */
    function depositToken(address user, WealthOSTypes.TokenData[] calldata datas) external nonReentrant onlyUserOrServant(user) userShouldBeVaultMember(user) {
        WealthOSLibrary_UserOperations.depositToken(state, user, datas);
    }

    /**
     * @notice User deposits native token into the vault
     */
    function depositNative() external payable nonReentrant userShouldBeVaultMember(msg.sender)  {
        // uint256 amount = msg.value;
        // if (amount == 0) revert WealthOSTypes.ZeroAmount();
        // address user = msg.sender;
        // uint256 _vaultOfUser = state.vaultOfUser[user];

        // _updateVaultNativeBalance(_vaultOfUser, amount, WealthOSTypes.Operations.ADDITION);
        // emit WealthOSTypes.NativeTokenDeposited(user, amount, block.timestamp);
        WealthOSLibrary_UserOperations.depositNative(state);
    }

    /**
     * @notice User withdraws tokens from the vault
     * @param datas The TokenData struct array
     */
    function withdrawToken(address user,  WealthOSTypes.TokenData[] calldata datas) external nonReentrant onlyUserOrServant(user) userShouldBeVaultMember(user) {
        WealthOSLibrary_UserOperations.withdrawToken(state, user, datas);

    }

    /**
     * @notice User withdraws native token from the vault
     * @param amount The amount to withdraw
     */
    function withdrawNative(address user, uint256 amount) external nonReentrant onlyUserOrServant(user) userShouldBeVaultMember(user) {
        WealthOSLibrary_UserOperations.withdrawNative(state, user, amount);

    }

    // ------------------------------------------------------------//



    /**
     * @notice Module withdraws ERC20 tokens from a vault's balance
     *         User should let module to withdraw
     * @param datas The UserTokenData array
     */
    function moduleWithdrawToken(WealthOSTypes.UserTokenData[] calldata datas) external onlyAuthorizedModule nonReentrant {
        // address module = msg.sender;
        // uint256 len = datas.length;
        // for (uint i; i < len;) {
        //     WealthOSTypes.UserTokenData calldata data = datas[i];
        //     address user = data.user;
        //     if (user == address(0)) revert WealthOSTypes.ZeroAddress();
        //     address token = data.token;
        //     if (token == address(0)) revert WealthOSTypes.ZeroAddress();
        //     uint256 amount = data.amount;
        //     if (amount == 0) revert WealthOSTypes.ZeroAmount();
        //     uint256 _vaultOfUser = state.vaultOfUser[user];
        //     if (_vaultOfUser == 0) revert WealthOSTypes.UserIsMemberOfAVault();
        //     if (!state.vaultAuthorizedModules[_vaultOfUser][module]) revert WealthOSTypes.UnauthorizedModuleByUser();
        //     if (state.vaultTokenBalance[_vaultOfUser][token] < amount) revert WealthOSTypes.InsufficientBalance(user, token);

        //     _updateVaultTokenBalance(_vaultOfUser, token, amount, WealthOSTypes.Operations.SUBTRACTION);
        //     _updateVaultTokenList(_vaultOfUser, token);
        //     _updateContractTokenList(token);

        //     // Transfer from core to module
        //     IERC20(token).safeTransfer(module, amount);
        //     emit WealthOSTypes.ModuleTokenWithdraw(user, module, token, amount, block.timestamp);

        //     unchecked { ++i; }
        // }

        WealthOSLibrary_ModuleOperations.withdrawToken(state, datas);
    }

    /**
     * @notice Module withdraws native tokens from a vault's balance
     *         User should let module to withdraw
     * @param datas The UserData array
     */
    function moduleWithdrawNative(WealthOSTypes.UserData[] calldata datas) external onlyAuthorizedModule nonReentrant {
        // address module = msg.sender;
        // uint256 len = datas.length;
        // for (uint i; i < len;) {
        //     WealthOSTypes.UserData calldata data = datas[i];

        //     address user = data.user;
        //     if (user == address(0)) revert WealthOSTypes.ZeroAddress();
        //     uint256 amount = data.amount;
        //     if (amount == 0) revert WealthOSTypes.ZeroAmount();
        //     uint256 _vaultOfUser = state.vaultOfUser[user];
        //     if (_vaultOfUser == 0) revert WealthOSTypes.UserIsMemberOfAVault();
        //     if(!state.vaultAuthorizedModules[_vaultOfUser][module]) revert WealthOSTypes.UnauthorizedModuleByUser();
        //     if (state.vaultNativeBalance[_vaultOfUser] < amount) revert WealthOSTypes.InsufficientBalance(user, address(0));

        //     _updateVaultNativeBalance(_vaultOfUser, amount, WealthOSTypes.Operations.SUBTRACTION);

        //     // Transfer from core to module
        //     (bool success, ) = payable(module).call{value: amount}("");
        //     if (!success) revert WealthOSTypes.NativeTransferFailed();

        //     emit WealthOSTypes.ModuleNativeTokenWithdraw(user, module, amount, block.timestamp);
        //     unchecked { ++i; }
        // }

        WealthOSLibrary_ModuleOperations.withdrawNative(state, datas);
    }

    /**
     * @notice Module deposits ERC20 tokens into a vault's balance
     * @param datas The UserTokenData array
     */
    function moduleDepositToken(WealthOSTypes.UserTokenData[] calldata datas) external onlyAuthorizedModule nonReentrant {
        // address module = msg.sender;
        // uint256 len = datas.length;
        // for (uint i; i < len;) {
        //     WealthOSTypes.UserTokenData calldata data = datas[i];

        //     address user = data.user;
        //     if(user == address(0)) revert WealthOSTypes.ZeroAddress();
        //     address token = data.token;
        //     if (token == address(0)) revert WealthOSTypes.ZeroAddress();
        //     uint256 amount = data.amount;
        //     if (amount == 0) revert WealthOSTypes.ZeroAmount();

        //     uint256 _vaultOfUser = state.vaultOfUser[user];
        //     if (_vaultOfUser == 0) revert WealthOSTypes.UserIsMemberOfAVault();

        //     _updateVaultTokenBalance(_vaultOfUser, token, amount, WealthOSTypes.Operations.ADDITION);
        //     _updateVaultTokenList(_vaultOfUser, token);
        //     _updateContractTokenList(token);

        //     // Transfers from module to core
        //     IERC20(token).safeTransferFrom(module, address(this), amount);
        //     emit WealthOSTypes.ModuleTokenDeposited(user, module, token, amount, block.timestamp);

        //     unchecked { ++i; }
        // }

        WealthOSLibrary_ModuleOperations.depositToken(state, datas);
    }

    /**
     * @notice Module deposits native tokens into a vault's balance
     * @param datas The UserData array
     * @param totalAmount Total native token amount
     */
    function moduleDepositNative(WealthOSTypes.UserData[] calldata datas, uint256 totalAmount) external payable onlyAuthorizedModule nonReentrant {
        // if (msg.value != totalAmount) {
        //     revert WealthOSTypes.InvalidAmountProvided(msg.value, totalAmount);
        // }

        // address module = msg.sender;
        // uint256 len = datas.length;
        // for (uint256 i = 0; i < len;) {
        //     WealthOSTypes.UserData calldata data = datas[i];

        //     uint256 amount = data.amount;
        //     if (amount == 0) revert WealthOSTypes.ZeroAmount();
        //     address user = data.user;
        //     if (user == address(0)) revert WealthOSTypes.ZeroAddress();
            
        //     uint256 _vaultOfUser = state.vaultOfUser[user];
        //     if (_vaultOfUser == 0) revert WealthOSTypes.UserIsMemberOfAVault();

        //     _updateVaultNativeBalance(_vaultOfUser, amount, WealthOSTypes.Operations.ADDITION);            
        //     emit WealthOSTypes.ModuleNativeTokenDeposited(user, module, amount, block.timestamp);

        //     unchecked { ++i; }
        // }

        WealthOSLibrary_ModuleOperations.depositNative(state, datas, totalAmount);

    }

    // ------------------------------------------------------------------ //

    
    // ------------------------------------------------------------ //

    function version() external pure returns(string memory) {
        return '1.0.0';
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

}