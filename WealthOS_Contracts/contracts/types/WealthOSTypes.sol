// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;


library WealthOSTypes {
    uint256 constant MAX_VAULT_MEMBER = 3;

    // --- STRUCTS ---

    struct State {
        address[]  contractTokens; /// @notice list of contract tokens
        mapping(address => uint256)  contractTokenIndex; /// @notice token => index in the contractTokens list
        mapping(address => bool)  contractHasToken; /// @notice token => exists in the contractTokens list

        uint256  contractNativeBalance; /// @notice native token balance
        mapping(address => uint256)  contractTokenBalance; /// @notice token => balance

        // --- Vault Info ---

        mapping (uint256 => address[])  vaultMembers; /// @notice vaultId =>  list of users
        mapping (uint256 => address[])  vaultTokens; /// @notice vaultId =>  list of tokens
        mapping (uint256 => mapping(address => uint256))  vaultTokenIndex; /// @notice vaultId =>  token => index in the vaultTokens list
        mapping (uint256 => mapping(address => bool))  vaultHasToken; /// @notice vaultId => token => exists in the vaultTokens list

        mapping (uint256 => mapping(address => uint256))  vaultTokenBalance; /// @notice vaultId => token => amount
        mapping (uint256 => uint256)  vaultNativeBalance; /// @notice vaultId => native token balance

        // User only can have one vault
        mapping (address => uint256) vaultOfUser; /// @notice user => vaultId
        mapping (address => uint256) vaultApproval; /// @notice user => vaultId 
        
        // --- Modules ---
        mapping(address => bool)  authorizedModules; /// @notice module address => authorization Only these modules can spend tokens
        mapping(uint256 => mapping(address => bool))  vaultAuthorizedModules; /// @notice Vaults only interact with modules that they authorize

        // --- Servant Module ---
        address servantModule; /// @notice Address of servant module 
    }

    struct TokenData {
        uint256 amount;
        address token;
    }

    struct UserTokenData {
        uint256 amount;
        address user;
        address token;
    }

    struct UserData {
        uint256 amount;
        address user;
    }

    // --- ENUMS ---

    enum Operations {ADDITION, SUBTRACTION}

    // --- ERRORS ---

    error ZeroAmount();
    error ZeroAddress();

    error OnlyUserCanDepositOrWithdraw(address expected, address received);
    error InsufficientBalance(address user, address token);
    error InvalidAmountProvided(uint256 sentAmount, uint256 totalAmount);
    error NativeTransferFailed();
    error InvalidOperation();

    error UnauthorizedModule();
    error UnauthorizedModuleByUser();
    error OnlyUserOrServant();

    error MaxVaultMemberOverflowed();
    error VaultShouldHaveAtLeastOneMember();
    error OnlyRemoveSameVaultID();
    error UserIsNotMemberOfAVault();
    error UserIsMemberOfAVault();
    error UserDidNotApproveTheVault();

    // --- EVENTS ---

    event ModuleAuthorized(address module);
    event ModuleRevoked(address module);
    event VaultAuthorizedModule(address indexed user, uint256 indexed vaultId, address indexed module);
    event VaultRevokedModule(address indexed user, uint256 indexed vaultId, address indexed module);

    event TokenDeposited(address indexed user, uint256 indexed vaultId, address indexed token, uint256 amount);
    event TokenWithdrawn(address indexed user, uint256 indexed vaultId, address indexed token, uint256 amount);
    event NativeTokenDeposited(address indexed user, uint256 indexed vaultId, uint256 amount);
    event NativeTokenWithdrawn(address indexed user, uint256 indexed vaultId, uint256 amount);
    
    event ModuleTokenWithdraw(uint256 indexed vaultId, address indexed module, address indexed token, uint256 amount);
    event ModuleTokenDeposited(uint256 indexed vaultId, address indexed module, address indexed token, uint256 amount);
    event ModuleNativeTokenWithdraw(uint256 indexed vaultId, address indexed module, uint256 amount);
    event ModuleNativeTokenDeposited(uint256 indexed vaultId, address indexed module, uint256 amount);

    event VaultCreated(address indexed user, uint256 indexed vaultId);
    event MemberAddedToVault(address indexed user, address indexed member, uint256 indexed vaultId);
    event MemberRemovedFromVault(address indexed user, address indexed member, uint256 indexed vaultId);
    event MemberApprovedTheVault(address indexed member, uint256 indexed vaultId);
    event MemberDisapprovedTheVault(address indexed member, uint256 indexed vaultId);
}