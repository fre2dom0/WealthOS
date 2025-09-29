// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../types/WealthOSTypes.sol"; 


library WealthOSLibrary_ModuleOperations {
    using SafeERC20 for IERC20; 

    /**
     * @notice Module withdraws ERC20 tokens from a vault's balance
     *         User should let module to withdraw
     * @param datas The UserTokenData array
     */
    function withdrawToken(
        WealthOSTypes.State storage state,
        WealthOSTypes.UserTokenData[] calldata datas
    ) internal {
        address module = msg.sender;
        uint256 len = datas.length;
        for (uint i; i < len;) {
            WealthOSTypes.UserTokenData calldata data = datas[i];

            address user = data.user;
            address token = data.token;
            if (user == address(0) || token == address(0)) revert WealthOSTypes.ZeroAddress();

            uint256 _vaultOfUser = state.vaultOfUser[user];
            if (_vaultOfUser == 0) revert WealthOSTypes.UserIsNotMemberOfAVault();

            uint256 amount = data.amount;
            if (amount == 0) revert WealthOSTypes.ZeroAmount();

            if (state.vaultTokenBalance[_vaultOfUser][token] < amount) revert WealthOSTypes.InsufficientBalance(user, token);
            if (!state.vaultAuthorizedModules[_vaultOfUser][module]) revert WealthOSTypes.UnauthorizedModuleByUser();

            _updateVaultTokenBalance(state, _vaultOfUser, token, amount, WealthOSTypes.Operations.SUBTRACTION);
            _updateVaultTokenList(state, _vaultOfUser, token);
            _updateContractTokenList(state, token);

            // Transfer from core to module
            IERC20(token).safeTransfer(module, amount);
            emit WealthOSTypes.ModuleTokenWithdraw(user, module, token, amount, block.timestamp);

            unchecked { ++i; }
        }
    }

        /**
     * @notice Module withdraws native tokens from a vault's balance
     *         User should let module to withdraw
     * @param datas The UserData array
     */
    function withdrawNative(
        WealthOSTypes.State storage state,
        WealthOSTypes.UserData[] calldata datas
    ) 
    internal {
        address module = msg.sender;
        uint256 len = datas.length;
        for (uint i; i < len;) {
            WealthOSTypes.UserData calldata data = datas[i];

            address user = data.user;
            if (user == address(0)) revert WealthOSTypes.ZeroAddress();

            uint256 _vaultOfUser = state.vaultOfUser[user];
            if (_vaultOfUser == 0) revert WealthOSTypes.UserIsNotMemberOfAVault();

            uint256 amount = data.amount;
            if (amount == 0) revert WealthOSTypes.ZeroAmount();

            if(!state.vaultAuthorizedModules[_vaultOfUser][module]) revert WealthOSTypes.UnauthorizedModuleByUser();
            if (state.vaultNativeBalance[_vaultOfUser] < amount) revert WealthOSTypes.InsufficientBalance(user, address(0));

            _updateVaultNativeBalance(state, _vaultOfUser, amount, WealthOSTypes.Operations.SUBTRACTION);

            // Transfer from core to module
            (bool success, ) = payable(module).call{value: amount}("");
            if (!success) revert WealthOSTypes.NativeTransferFailed();

            emit WealthOSTypes.ModuleNativeTokenWithdraw(user, module, amount, block.timestamp);
            unchecked { ++i; }
        }
    }

    /**
     * @notice Module deposits ERC20 tokens into a vault's balance
     * @param datas The UserTokenData array
     */
    function depositToken(
        WealthOSTypes.State storage state,
        WealthOSTypes.UserTokenData[] calldata datas) 
    internal {
        address module = msg.sender;
        uint256 len = datas.length;
        for (uint i; i < len;) {
            WealthOSTypes.UserTokenData calldata data = datas[i];

            address user = data.user;
            address token = data.token;
            if(user == address(0) || token == address(0)) revert WealthOSTypes.ZeroAddress();
            uint256 amount = data.amount;
            if (amount == 0) revert WealthOSTypes.ZeroAmount();

            uint256 _vaultOfUser = state.vaultOfUser[user];
            if (_vaultOfUser == 0) revert WealthOSTypes.UserIsNotMemberOfAVault();

            _updateVaultTokenBalance(state, _vaultOfUser, token, amount, WealthOSTypes.Operations.ADDITION);
            _updateVaultTokenList(state, _vaultOfUser, token);
            _updateContractTokenList(state, token);

            // Transfers from module to core
            IERC20(token).safeTransferFrom(module, address(this), amount);
            emit WealthOSTypes.ModuleTokenDeposited(user, module, token, amount, block.timestamp);

            unchecked { ++i; }
        }
    }

    /**
     * @notice Module deposits native tokens into a vault's balance
     * @param datas The UserData array
     * @param totalAmount Total native token amount
     */
    function depositNative(
        WealthOSTypes.State storage state,
        WealthOSTypes.UserData[] calldata datas, uint256 totalAmount
    ) internal {
        if (msg.value != totalAmount) {
            revert WealthOSTypes.InvalidAmountProvided(msg.value, totalAmount);
        }

        address module = msg.sender;
        uint256 len = datas.length;
        for (uint256 i = 0; i < len;) {
            WealthOSTypes.UserData calldata data = datas[i];

            uint256 amount = data.amount;
            if (amount == 0) revert WealthOSTypes.ZeroAmount();
            
            address user = data.user;
            if (user == address(0)) revert WealthOSTypes.ZeroAddress();
            
            uint256 _vaultOfUser = state.vaultOfUser[user];
            if (_vaultOfUser == 0) revert WealthOSTypes.UserIsNotMemberOfAVault();

            _updateVaultNativeBalance(state, _vaultOfUser, amount, WealthOSTypes.Operations.ADDITION);            
            emit WealthOSTypes.ModuleNativeTokenDeposited(user, module, amount, block.timestamp);

            unchecked { ++i; }
        }
    }

    function _updateVaultTokenBalance(
        WealthOSTypes.State storage state,
        uint256 vaultId, address token, uint256 amount, WealthOSTypes.Operations operation
    ) private {
        if (operation == WealthOSTypes.Operations.ADDITION) {
            state.vaultTokenBalance[vaultId][token] += amount;
            state.contractTokenBalance[token] += amount;
        }
        else if (operation == WealthOSTypes.Operations.SUBTRACTION) {
            state.vaultTokenBalance[vaultId][token] -= amount;
            state.contractTokenBalance[token] -= amount;
        }
        else {
            revert WealthOSTypes.InvalidOperation();
        }
    }

    /**
     * @dev Updates native balance of vault and contract
     */
    function _updateVaultNativeBalance(
        WealthOSTypes.State storage state,
        uint256 _vaultId, uint256 amount, WealthOSTypes.Operations operation
    ) private {
        if (operation == WealthOSTypes.Operations.ADDITION) {
            state.vaultNativeBalance[_vaultId] += amount;
            state.contractNativeBalance += amount;
        }
        else if (operation == WealthOSTypes.Operations.SUBTRACTION) {
            state.vaultNativeBalance[_vaultId] -= amount;
            state.contractNativeBalance -= amount;
        }
        else {
            revert WealthOSTypes.InvalidOperation();
        }
    }

    /**
     * @dev Updates a token the user's vault
     */
    function _updateVaultTokenList(
        WealthOSTypes.State storage state,
        uint256 _vaultId, address token
    ) private {
        // Adding
        if (state.vaultTokenBalance[_vaultId][token] > 0 && !state.vaultHasToken[_vaultId][token]) {
            state.vaultTokenIndex[_vaultId][token] = state.vaultTokens[_vaultId].length;
            state.vaultTokens[_vaultId].push(token);
            state.vaultHasToken[_vaultId][token] = true;
        }
        // Removing
        else if (state.vaultTokenBalance[_vaultId][token] == 0 && state.vaultHasToken[_vaultId][token]) {
            assert(state.vaultTokens[_vaultId].length > 0);
            address[] storage tokens = state.vaultTokens[_vaultId];
            uint256 index = state.vaultTokenIndex[_vaultId][token];
            uint256 lastIndex = tokens.length - 1;

            if (index != lastIndex) {
                address lastToken = tokens[lastIndex];
                tokens[index] = lastToken;
                state.vaultTokenIndex[_vaultId][lastToken] = index;
            }

            tokens.pop();
            delete state.vaultTokenIndex[_vaultId][token];
            delete state.vaultHasToken[_vaultId][token];
        }
    }

    /** 
     * @dev Updates a token contract's token list
     */
    function _updateContractTokenList(
        WealthOSTypes.State storage state,
        address token
    ) private {
        // Adding
        if (state.contractTokenBalance[token] > 0 && !state.contractHasToken[token]) {
            state.contractTokenIndex[token] = state.contractTokens.length;
            state.contractTokens.push(token);
            state.contractHasToken[token] = true;
        }
        // Removing
        else if (state.contractTokenBalance[token] == 0 && state.contractHasToken[token]) {
            assert(state.contractTokens.length > 0);

            uint256 index = state.contractTokenIndex[token];
            uint256 lastIndex = state.contractTokens.length - 1;

            if (index != lastIndex) {
                address lastToken = state.contractTokens[lastIndex];
                state.contractTokens[index] = lastToken;
                state.contractTokenIndex[lastToken] = index;
            }

            state.contractTokens.pop();
            delete state.contractTokenIndex[token];
            delete state.contractHasToken[token];
        }

    }
}

