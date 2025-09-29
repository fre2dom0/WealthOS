// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {AccessControlUpgradeable} from "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import {ERC2771ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/metatx/ERC2771ContextUpgradeable.sol";
import {ContextUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ContextUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

contract WealthOSServantModule is Initializable, AccessControlUpgradeable, UUPSUpgradeable, ERC2771ContextUpgradeable, ReentrancyGuardUpgradeable {
    // --- STORAGE ---
    bytes32 public constant SERVANT_ROLE = keccak256("SERVANT_ROLE");

    uint256 public constant MIN_APPROVAL_TIME = 1 hours;
    uint256 public constant MAX_APPROVAL_TIME = 4 weeks;
    
    mapping(address => uint256) public userApprovalExpiry; /// @notice user > expiry
    mapping (address => bool) public allFnsApproved; /// @notice user => boolean
    mapping(address => mapping(bytes4 => bool)) public isFnApproved; /// @notice user => selector => boolean

    mapping(address => bool) public authorizedModules;

    // --- ERRORS ---
    error NotApproved();
    error ApprovalExpired();
    error ApprovalTimeOutOfRange(uint256 providedTime, uint256 min, uint256 max);
    error CannotApproveIfTimeIsZeroWithoutFunctionSelectors();
    error EmptyFunctionSelector();
    error FunctionCallFailure(bytes data);
    error FunctionNotApproved(bytes4 fnSelector);
    error UnauthorizedModule();
    error ZeroAddress();

    // --- EVENTS ---
    event Approved(address indexed user, bytes4 selector, uint256 time, uint256 timestamp);
    event FunctionRevoked(address indexed user, bytes4 selector, uint256 timestamp);
    event Revoked(address indexed user, uint256 timestamp);
    event Executed(address indexed user, address indexed module, bytes data, uint256 timestamp);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor(address forwarder) ERC2771ContextUpgradeable(forwarder) {
        _disableInitializers();
    }

    function initialize() public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();
        __Context_init();
        __ReentrancyGuard_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _msgSender());
    }

    function approve(uint256 time, bytes4[] calldata addedfnSelectors) external {
        if (time != 0 && (time < MIN_APPROVAL_TIME || time > MAX_APPROVAL_TIME)) revert ApprovalTimeOutOfRange(time, MIN_APPROVAL_TIME, MAX_APPROVAL_TIME);

        address USER = _msgSender();
        uint256 TIMESTAMP = block.timestamp;
        if (addedfnSelectors.length == 0 ) {
            if (time == 0) revert CannotApproveIfTimeIsZeroWithoutFunctionSelectors();
            allFnsApproved[USER] = true;
            emit Approved(USER, bytes4(0), time, TIMESTAMP);
        } 
        else {
            for (uint i; i < addedfnSelectors.length; ) {
                bytes4 fnSelector = addedfnSelectors[i];

                if (!isFnApproved[USER][fnSelector] && fnSelector != bytes4(0)) {
                    isFnApproved[USER][fnSelector] = true;
                    emit Approved(USER, fnSelector, time, TIMESTAMP);
                }

                emit Approved(USER, fnSelector, time, TIMESTAMP);
                unchecked { ++i; }
            }

            allFnsApproved[USER] = false;
        }
        
        if (time != 0) userApprovalExpiry[USER] = TIMESTAMP + time;
    }

    function revokeFunctions(bytes4[] calldata removedFnSelectors) external {
        address USER= _msgSender();
        uint256 TIMESTAMP = block.timestamp;
        for (uint i; i < removedFnSelectors.length; ) {
            bytes4 fnSelector = removedFnSelectors[i];
            if (isFnApproved[USER][fnSelector] && fnSelector != bytes4(0)) {
                isFnApproved[USER][fnSelector] = false;
            }

            emit FunctionRevoked(USER, fnSelector, TIMESTAMP);
            unchecked { ++i; }
        }
    }

    function revoke() external {
        address USER = _msgSender();
        userApprovalExpiry[USER] = 0;
        emit Revoked(USER, block.timestamp);
    }

    function execute(address user, address module, bytes calldata data) external onlyRole(SERVANT_ROLE) nonReentrant returns (bytes memory returnData) {   
        if (block.timestamp > userApprovalExpiry[user]) revert ApprovalExpired();
        if (!authorizedModules[module]) revert UnauthorizedModule();

        if(!allFnsApproved[user]) {
            bytes4 selector;
            assembly {
                selector := calldataload(data.offset)
            }
            if (!isFnApproved[user][selector]) revert FunctionNotApproved(selector);
        }

        bool success;
        (success, returnData) = module.call(data);
        if(!success) revert FunctionCallFailure(data);
        
        emit Executed(user, module, data, block.timestamp);
        return returnData;
    }

    function authorizeModule(address[] calldata modules) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint i; i < modules.length; ) {
            address module = modules[i];

            if (module == address(0)) revert ZeroAddress();
            authorizedModules[module] = true;

            unchecked { ++i; }
        }
    }

    function unauthorizeModule(address[] calldata modules) external onlyRole(DEFAULT_ADMIN_ROLE) {
        for (uint i; i < modules.length; ) {
            address module = modules[i];
            
            if (module == address(0)) revert ZeroAddress();
            authorizedModules[module] = false;

            unchecked { ++i; }
        }
    }

    function version() external pure returns(string memory) {
        return '1.0.0';
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyRole(DEFAULT_ADMIN_ROLE) {

    }

    function _msgSender() internal view override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (address sender) {
        sender = ERC2771ContextUpgradeable._msgSender();
    }
    function _msgData() internal view override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (bytes calldata) {
        return ERC2771ContextUpgradeable._msgData();
    }
    function _contextSuffixLength() internal view override(ContextUpgradeable, ERC2771ContextUpgradeable) returns (uint256) {
        return ERC2771ContextUpgradeable._contextSuffixLength();
    }

    receive() external payable {}
}