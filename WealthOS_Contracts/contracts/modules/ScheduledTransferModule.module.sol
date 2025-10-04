// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../libraries/ServantModuleLibrary.sol";
import "../types/WealthOSTypes.sol"; 


/**
 * @title IWealthOSCore
 * @notice Interface for interacting with WealthOS Core contract
 */
interface IWealthOSCore {
    function moduleWithdrawToken(WealthOSTypes.UserTokenData[] calldata datas) external;
    function moduleWithdrawNative(WealthOSTypes.UserData[] calldata datas) external;
}

/**
 * @title WealthOSScheduledTransferModule
 * @author fre2dom0
 * @notice A module for scheduling token transfers at a future time
 * @dev Supports both immediate and on-demand withdrawal options
 */
contract WealthOSScheduledTransferModule is Initializable, UUPSUpgradeable, OwnableUpgradeable, PausableUpgradeable {
    using SafeERC20 for IERC20; 
    using ServantModuleLibrary for *;
    ServantModuleLibrary.State servantModuleState;

    // --- Enums ---
    /**
     * @notice Defines when the tokens are withdrawn from the user
     * @dev IMMEDIATE_WITHDRAW: Tokens are withdrawn when scheduling
     *      ON_EXECUTE_WITHDRAW: Tokens are withdrawn when executing
     */
    enum ScheduleType {
        IMMEDIATE_WITHDRAW,
        ON_EXECUTE_WITHDRAW
    }

    /**
     * @notice Specifies the operation type for managing active transfer lists
     * @dev Used internally to add or remove transfer IDs from global/user-specific active lists
     */
    enum UpdateType {
        ADD,      /// @notice Add a transfer ID to the active list
        REMOVE    /// @notice Remove a transfer ID from the active list
    }

    /**
     * @notice Represents the lifecycle state of a scheduled transfer
     * @dev Determines whether a transfer can be cancelled or executed
     */
    enum ExecutionStatus {
        ACTIVE,     /// @notice Transfer is scheduled and can be cancelled or executed
        CANCELLED,  /// @notice Transfer was cancelled by the owner; funds refunded
        SENT        /// @notice Transfer was successfully executed and funds sent
    }

    // --- Errors ---
    error ZeroAddress();
    error ZeroAmount();
    error NoTransferFound();

    error InvalidExecutionTime();
    error InvalidAmountProvided(uint256 expected, uint256 received);
    error MaxTransferCountExceeds();
    error TooEarlyToExecute(uint256 executionTime, uint256 time);

    error OnlyTransferOwnerCanCancel(address owner, address sender);
    error OnlyActiveTransfers(uint256 id);
    error OnlyUserOrServant();



    // --- Events ---
    /**
     * @notice Emitted when a new transfer is scheduled
     * @param transferId Unique identifier for the transfer
     * @param from User who scheduled the transfer
     * @param to Recipient of the transfer
     * @param token Token to transfer
     * @param amount Amount to transfer
     * @param executionTime Timestamp to execute the transfer
     * @param scheduleType When tokens are withdrawn
     */
    event TransferScheduled(uint256 indexed transferId, address indexed from, address indexed to, address token, uint256 amount, uint256 executionTime, ScheduleType scheduleType, uint256 timestamp);

    /**
     * @notice Emitted when a scheduled transfer is cancelled by the owner
     * @param transferId The unique identifier of the cancelled transfer
     * @param timestamp The block timestamp when the cancellation occurred
     */
    event TransferCancelled(uint256 indexed transferId, uint256 timestamp);

    /**
     * @notice Emitted when a scheduled transfer is executed
     * @param transferId Unique identifier for the transfer
     * @param to Recipient of the transfer
     * @param amount Amount transferred
     */
    event TransferExecuted(uint256 indexed transferId,address indexed from, address indexed to, uint256 amount, uint256 timestamp);

    // ------------------------------------------------------------------------------------------- //s

    modifier onlyUserOrServant(address user) {
       ServantModuleLibrary._onlyUserOrServant(servantModuleState, user);
       _;
    }


    // ------------------------------------------------------------------------------------------- //s

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the module with the core contract address
     * @param _core Address of the WealthOS Core contract
     */
    function initialize(address _core, address servantModule) external initializer {
        if (_core == address(0) || servantModule == address(0)) revert ZeroAddress();
        __Ownable_init(_msgSender());
        __Pausable_init();
        __UUPSUpgradeable_init();

        core = IWealthOSCore(_core);
        ServantModuleLibrary._setServantModule(servantModuleState, servantModule);
        maxTransferCount = 10;
        _ids = 0;
    }

    // --- Storage ---
    /// @notice Reference to the WealthOS Core contract
    uint256 private _ids; 
    IWealthOSCore public core;
    uint8 public maxTransferCount;

    uint256[] public activeTransfers; /// @notice all active id array
    mapping (uint256 => uint256) public indexOfActiveTransfer; /// @notice id => index
    mapping (address => mapping (uint256 => uint256)) public indexOfActiveTransferOfUser; /// @notice user => id => index
    mapping (address => uint256[]) public activeTransfersOfUser; /// @notice user => id array of user
    mapping (uint256 => ScheduledTransfer) public scheduledTransfer; /// @notice id => ScheduledTransfer

    function getActiveTransfersOfUser(address user) external view returns(uint256[] memory) {
        return activeTransfersOfUser[user];
    }

    function getActiveTransfersOfUserLength(address user) external view returns(uint256) {
        return activeTransfersOfUser[user].length;
    }

    function getActiveTransfers() external view returns(uint256[] memory) {
        return activeTransfers;
    }

    function getActiveTransfersLength() external view returns(uint256) {
        return activeTransfers.length;
    }

    /**
     * @notice Represents a scheduled transfer
     * @dev Stored in a mapping with transferId as key.
     *      If token is address(0), the transfer is for native currency (ETH).
     */
    struct ScheduledTransfer {
        uint256 executionTime;     /// Execution time
        uint256 amount;            /// Amount to transfer
        address from;              /// User who scheduled the transfer
        address to;                /// Recipient of the transfer
        address token;             /// Token to transfer
        ScheduleType scheduleType; /// When tokens are withdrawn
        ExecutionStatus status;             /// Is executed flag
    }

    /**
     * @notice Input data for scheduling a new transfer
     */
    struct ScheduledTransferRequirements {
        uint256 executionTime;     /// Execution time
        uint256 amount;            /// Amount to transfer
        address to;                /// Recipient of the transfer
        address token;             /// Token to transfer
        ScheduleType scheduleType; /// When tokens are withdrawn
    }

    // ------------------------------------------------------------------------------------------- //

    /**
     * @notice Schedules one or more future transfers for a user
     * @dev Supports both ERC20 and native token transfers.
     *      If ScheduleType.IMMEDIATE_WITHDRAW is used, funds are withdrawn from the user upfront.
     *      Native transfers require msg.value to match the total native amount.
     *      Gets execution time as seconds and adds it with block timestamp
     * @param user The address scheduling the transfer (must be msg.sender or their servant)
     * @param _datas Array of transfer requirements
     */
    function scheduleTransfer(address user, ScheduledTransferRequirements[] calldata _datas) external whenNotPaused onlyUserOrServant(user) {
        
        // Checks
        uint256 LEN = _datas.length;
        if (activeTransfersOfUser[user].length + LEN > maxTransferCount) revert MaxTransferCountExceeds();
        uint256 TIMESTAMP = block.timestamp;

        for (uint256 i; i < LEN;) {
            ScheduledTransferRequirements calldata data = _datas[i];

            // Checks
            if (data.to == address(0)) revert ZeroAddress();
            if (data.amount == 0) revert ZeroAmount(); 
            if (data.executionTime == 0) revert InvalidExecutionTime();

            // Withdraw token
            if (data.scheduleType == ScheduleType.IMMEDIATE_WITHDRAW) {
                // ERC20 Token
                if (data.token != address(0)) {
                    WealthOSTypes.UserTokenData[] memory userTokenDatas = new WealthOSTypes.UserTokenData[](1);
                    userTokenDatas[0] = WealthOSTypes.UserTokenData(data.amount, user, data.token);
                    core.moduleWithdrawToken(userTokenDatas);
                // Native Token
                } else {
                    WealthOSTypes.UserData[] memory userDatas = new WealthOSTypes.UserData[](1);
                    userDatas[0] = WealthOSTypes.UserData(data.amount, user);
                    core.moduleWithdrawNative(userDatas);
                }
            }

            uint256 id = _ids;

            _updateActiveUserTransfers(id, user, UpdateType.ADD);
            _updateActiveTransfers(id, UpdateType.ADD);

            // Save transfer
            scheduledTransfer[id] = ScheduledTransfer(data.executionTime + TIMESTAMP, data.amount, user, data.to, data.token, data.scheduleType, ExecutionStatus.ACTIVE);

            _ids++;
            emit TransferScheduled(id, user, data.to, data.token, data.amount, data.executionTime, data.scheduleType, TIMESTAMP);
            unchecked { ++i; }
        }
    }

    /**
     * @notice Cancels one or more scheduled transfers belonging to a user
     * @dev Only the transfer owner (or their authorized servant) can cancel.
     *      Transfers must be in ACTIVE status.
     *      Refunds tokens/native assets to the original sender.
     * @param user The address of the transfer owner
     * @param transferIds Array of transfer IDs to cancel
     */
    function cancelScheduledTransfer(address user, uint256[] calldata transferIds) external onlyUserOrServant(user) {
        uint256 LEN = transferIds.length;
        for (uint i; i < LEN;) {
            uint256 id = transferIds[i];
            ScheduledTransfer storage transfer = scheduledTransfer[id];

            // Checks
            if (transfer.from == address(0)) revert NoTransferFound();
            if (transfer.from != user) revert OnlyTransferOwnerCanCancel(transfer.from, user); // Only transfer owner can cancel
            if (transfer.status != ExecutionStatus.ACTIVE) revert OnlyActiveTransfers(id);

            // Token refund
            if (transfer.scheduleType == ScheduleType.IMMEDIATE_WITHDRAW) {
                if (transfer.token != address(0)) {
                    IERC20(transfer.token).safeTransfer(transfer.from, transfer.amount);
                } else {
                    (bool success, ) = payable(transfer.from).call{value: transfer.amount}("");
                    if (!success) revert WealthOSTypes.NativeTransferFailed();
                }
            }

            _updateActiveTransfers(id, UpdateType.REMOVE);
            _updateActiveUserTransfers(id, user, UpdateType.REMOVE);
            transfer.status = ExecutionStatus.CANCELLED;

            emit TransferCancelled(id, block.timestamp);
            unchecked { ++i; }
        }
    }

    /**
     * @notice Executes one or more scheduled transfers
     * @dev Can be called by anyone
     *      Only ACTIVE transfers with executionTime > block.timestamp can be executed.
     *      If ScheduleType.ON_EXECUTE_WITHDRAW is used, funds are withdrawn at execution time.
     *      Transfers tokens/native assets to the recipient.
     * @param transferIds Array of transfer IDs to execute
     */
function executeScheduledTransfer(uint256[] calldata transferIds) external {
        uint256 LEN = transferIds.length;
        uint256 TIMESTAMP = block.timestamp;
        for (uint i; i < LEN;) {
            uint256 id = transferIds[i];
            ScheduledTransfer storage transfer = scheduledTransfer[id];

            // Checks
            if (transfer.from == address(0)) revert NoTransferFound();
            if (transfer.status != ExecutionStatus.ACTIVE) revert OnlyActiveTransfers(id);
            if (transfer.executionTime > TIMESTAMP) revert TooEarlyToExecute(transfer.executionTime, TIMESTAMP);

            // Withdraw token
            if (transfer.scheduleType == ScheduleType.ON_EXECUTE_WITHDRAW) {
                // ERC20 Token
                if (transfer.token != address(0)) {
                    WealthOSTypes.UserTokenData[] memory userTokenDatas = new WealthOSTypes.UserTokenData[](1);
                    userTokenDatas[0] = WealthOSTypes.UserTokenData(transfer.amount, transfer.from, transfer.token);
                    core.moduleWithdrawToken(userTokenDatas);
                // Native Token
                } else {
                    WealthOSTypes.UserData[] memory userDatas = new WealthOSTypes.UserData[](1);
                    userDatas[0] = WealthOSTypes.UserData(transfer.amount, transfer.from);
                    core.moduleWithdrawNative(userDatas);
                }
            }

            // Send token
            if (transfer.token != address(0)) {
                IERC20(transfer.token).safeTransfer(transfer.to, transfer.amount);
            } else {
                (bool success, ) = payable(transfer.to).call{value: transfer.amount}("");
                if (!success) revert WealthOSTypes.NativeTransferFailed();
            }

            _updateActiveTransfers(id, UpdateType.REMOVE);
            _updateActiveUserTransfers(id, transfer.from, UpdateType.REMOVE);
            transfer.status = ExecutionStatus.SENT;

            emit TransferExecuted(id, transfer.from, transfer.to, transfer.amount, TIMESTAMP);
            unchecked { ++i; }
        }
    }

    // ------------------------------------------------------------------------------------------- //

    /**
     * @notice Updates the global active transfers list
     * @dev Uses swap-and-pop pattern for O(1) removal
     * @param transferId The ID of the transfer to add or remove
     * @param _type Whether to ADD or REMOVE the transfer
     */
    function _updateActiveTransfers(uint256 transferId, UpdateType _type) internal {
        if (_type == UpdateType.ADD) {
            indexOfActiveTransfer[transferId] = activeTransfers.length;
            activeTransfers.push(transferId);
        }
        else if (_type == UpdateType.REMOVE) {
            uint256 index = indexOfActiveTransfer[transferId];
            uint256 lastIndex = activeTransfers.length - 1;

            if (index != lastIndex) {
                uint256 lastIndexId = activeTransfers[lastIndex];
                
                activeTransfers[index] = lastIndexId;
                indexOfActiveTransfer[lastIndexId] = index;
            }

            activeTransfers.pop();
            delete indexOfActiveTransfer[transferId];
        }
    }

    /**
     * @notice Updates the per-user active transfers list
     * @dev Uses swap-and-pop pattern for O(1) removal
     * @param transferId The ID of the transfer to add or remove
     * @param user The user whose list is being updated
     * @param _type Whether to ADD or REMOVE the transfer
     */
    function _updateActiveUserTransfers(uint256 transferId, address user, UpdateType _type) internal {
        if (_type == UpdateType.ADD) {
            indexOfActiveTransferOfUser[user][transferId] = activeTransfersOfUser[user].length;
            activeTransfersOfUser[user].push(transferId);
        }
        else if (_type == UpdateType.REMOVE) {
            uint256 index = indexOfActiveTransferOfUser[user][transferId];
            uint256 lastIndex = activeTransfersOfUser[user].length - 1;

            if (index != lastIndex) {
                uint256 lastIndexId = activeTransfersOfUser[user][lastIndex];
                
                activeTransfersOfUser[user][index] = lastIndexId;
                indexOfActiveTransferOfUser[user][lastIndexId] = index;
            }

            activeTransfersOfUser[user].pop();
            delete indexOfActiveTransferOfUser[user][transferId];
        }
    }

    // ------------------------------------------------------------------------------------------- //

    /**
     * @notice Sets the maximum number of active transfers a user can have
     * @dev Can only be called by the contract owner
     * @param count New maximum transfer count (must be reasonable)
    */
    function setMaxTransferCount(uint8 count) external onlyOwner{
        maxTransferCount = count;
    }

    /**
     * @notice Updates the address of the Servant Module
     * @dev Used to change the module that manages servant relationships
     * @param servantModule The new servant module address
     */
    function setServantModule(address servantModule) external onlyOwner {
        ServantModuleLibrary._setServantModule(servantModuleState, servantModule);
    }

    /**
     * @notice Toggles the pause state for scheduling new transfers
     * @dev If paused, new transfers cannot be scheduled.
     *      Existing transfers can still be cancelled or executed.
     * @dev Note: This function toggles between paused/unpaused states.
     */
    function pauseOrStartSchedulingTransfer() external onlyOwner {
        if (paused()) {
            _pause();
        } else {
            _unpause();
        }
    }

    /**
     * @notice Authorizes upgrade to a new implementation
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}

    function version() external pure returns(string memory) {
        return '1.0.0';
    }

    receive() external payable {}
}