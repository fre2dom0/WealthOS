// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import '@openzeppelin/contracts/metatx/ERC2771Forwarder.sol';

contract WealthOSERC2771Forwarder is ERC2771Forwarder {
    constructor(string memory name) ERC2771Forwarder(name) {

    }
}