// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

abstract contract WealthOS_Storage {
    // --- Contract Info ---
    address[] public contractTokens; /// @notice list of contract tokens
    mapping(address => uint256) public contractTokenIndex; /// @notice token => index in the contractTokens list
    mapping(address => bool) public contractHasToken; /// @notice token => exists in the contractTokens list

    uint256 public contractNativeBalance; /// @notice native token balance
    mapping(address => uint256) public contractTokenBalance; /// @notice token => balance

    // --- Vault Info ---
    uint256 constant MAX_VAULT_MEMBER = 3;

    mapping (uint256 => address[]) public vaultMembers; /// @notice vaultId =>  list of users
    mapping (uint256 => address[]) public vaultTokens; /// @notice vaultId =>  list of tokens
    mapping (uint256 => mapping(address => uint256)) public vaultTokenIndex; /// @notice vaultId =>  token => index in the vaultTokens list
    mapping (uint256 => mapping(address => bool)) public vaultHasToken; /// @notice vaultId => token => exists in the vaultTokens list

    mapping (uint256 => mapping(address => uint256)) public vaultTokenBalance; /// @notice vaultId => token => amount
    mapping (uint256 => uint256) public vaultNativeBalance; /// @notice vaultId => native token balance

    // User only can have one vault
    mapping (address => uint256) public vaultOfUser; /// @notice user => vaultId
    mapping (address => uint256) public vaultApproval; /// @notice user => vaultId 

    // --- User Info ---
    // mapping(address => address[]) public userTokens; /// @notice user => list of tokens
    // mapping(address => mapping(address => uint256)) public userTokenIndex; /// @notice user => token => index in the userTokens list
    // mapping(address => mapping(address => bool)) public userHasToken; /// @notice user => token => exists in userTokens list

    // mapping(address => mapping(address => uint256)) public userTokenBalance; /// @notice user => token => amount
    // mapping(address => uint256) public userNativeBalance; /// @notice user => native token balance
    
    // --- Modules ---
    mapping(address => bool) public authorizedModules; /// @notice module address => authorization Only these modules can spend tokens
    mapping(uint256 => mapping(address => bool)) public vaultAuthorizedModules; /// @notice Vaults only interact with modules that they authorize

    // --- Servant Module ---
    address public servantModule; /// @notice Address of servant module 

    // --- Getters ---

    function getContractTokensLength() external view returns (uint256) {
        return contractTokens.length;
    }

    function getContractTokens() external view returns (address[] memory) {
        return contractTokens;
    }

    function getVaultTokens(uint256 _vaultId) external view returns (address[] memory) {
        return vaultTokens[_vaultId];
    }

    function getVaultTokensLength(uint256 _vaultId) external view returns (uint256) {
        return vaultTokens[_vaultId].length;
    }

    // function getUserTokensLength(address user) external view returns (uint256) {
    //     return userTokens[user].length;
    // }

    // function getUserTokens(address user) external view returns (address[] memory) {
    //     return userTokens[user];
    // }

}