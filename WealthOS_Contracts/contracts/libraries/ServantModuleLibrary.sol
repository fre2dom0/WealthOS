// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;


library ServantModuleLibrary {
    struct State { 
        address servantModule;
    }

    error OnlyUserOrServant();

    function _setServantModule(State storage s, address _servantModule) internal {
        s.servantModule = _servantModule;
    }

    function _onlyUserOrServant(State storage s, address user) view internal {
        bool isUser = (msg.sender == user);
        bool isServant = (msg.sender == s.servantModule);
        if (!isUser && !isServant) revert OnlyUserOrServant();
    }
}