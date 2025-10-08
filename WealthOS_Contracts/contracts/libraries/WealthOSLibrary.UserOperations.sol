// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../types/WealthOSTypes.sol"; 


library WealthOSLibrary_UserOperations {
    using SafeERC20 for IERC20; 

    /**
     * @notice User deposits ERC20 tokens into the vault
     * @param datas The TokenData struct array
    */
    function depositToken(
        WealthOSTypes.State storage state,
        address user, WealthOSTypes.TokenData[] calldata datas
    ) internal {
        uint256 len = datas.length;
        for (uint i; i < len;) {
            WealthOSTypes.TokenData calldata data = datas[i];
            address token = data.token;
            if(token == address(0)) revert WealthOSTypes.ZeroAddress();
            uint256 amount = data.amount;
            if (amount == 0) revert WealthOSTypes.ZeroAmount();

            uint256 vaultId = state.vaultOfUser[user];
            

            _updateVaultTokenBalance(state, vaultId, token, amount, WealthOSTypes.Operations.ADDITION);
            _updateVaultTokenList(state, vaultId, token);
            _updateContractTokenList(state, token);
            
            IERC20(token).safeTransferFrom(user, address(this), amount);
            emit WealthOSTypes.TokenDeposited(user, vaultId, token, amount, block.timestamp);

            unchecked { ++i; }
        }
    }

    /**
     * @notice User deposits native token into the vault
     */
    function depositNative(WealthOSTypes.State storage state) internal {
        uint256 amount = msg.value;
        if (amount == 0) revert WealthOSTypes.ZeroAmount();
        address user = msg.sender;
        uint256 _vaultOfUser = state.vaultOfUser[user];

        _updateVaultNativeBalance(state, _vaultOfUser, amount, WealthOSTypes.Operations.ADDITION);
        emit WealthOSTypes.NativeTokenDeposited(user, _vaultOfUser, amount, block.timestamp);
    }

    /**
     * @notice User withdraws tokens from the vault
     * @param datas The TokenData struct array
     */
    function withdrawToken(
        WealthOSTypes.State storage state,
        address user,  WealthOSTypes.TokenData[] calldata datas
    ) internal {
        uint256 len = datas.length;
        for (uint i; i < len;) {
            WealthOSTypes.TokenData calldata data = datas[i];

            address token = data.token;
            if (token == address(0)) revert WealthOSTypes.ZeroAddress();
            uint256 amount = data.amount;
            if (amount == 0) revert WealthOSTypes.ZeroAmount();
            uint256 _vaultOfUser = state.vaultOfUser[user];

            if (state.vaultTokenBalance[_vaultOfUser][token] < amount) revert WealthOSTypes.InsufficientBalance(user, token);

            _updateVaultTokenBalance(state, _vaultOfUser, token, amount, WealthOSTypes.Operations.SUBTRACTION);
            _updateVaultTokenList(state, _vaultOfUser, token);
            _updateContractTokenList(state, token);

            IERC20(token).safeTransfer(user, amount);
            emit WealthOSTypes.TokenWithdrawn(user, _vaultOfUser, token, amount, block.timestamp);

            unchecked { ++i; }
        }
    }

    /**
     * @notice User withdraws native token from the vault
     * @param amount The amount to withdraw
     */
    function withdrawNative(
        WealthOSTypes.State storage state,
        address user, uint256 amount
    ) internal {
        if (amount == 0) revert WealthOSTypes.ZeroAmount();
        uint256 _vaultOfUser = state.vaultOfUser[user];
        if (state.vaultNativeBalance[_vaultOfUser] < amount) revert WealthOSTypes.InsufficientBalance(user, address(0));

        _updateVaultNativeBalance(state, _vaultOfUser, amount, WealthOSTypes.Operations.SUBTRACTION);

        (bool success, ) = payable(user).call{value: amount}("");
        if (!success) revert WealthOSTypes.NativeTransferFailed();

        emit WealthOSTypes.NativeTokenWithdrawn(user, _vaultOfUser, amount, block.timestamp);
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

