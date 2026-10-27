// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

interface IBlackHoleToken {
    function freezeAccount(address account, string memory reason) external;
    function isAccountFrozen(address account) external view returns (bool);
    function getAuditTrail(address account) external view returns (tuple[] memory);
}

/**
 * @title Cybercrime Enforcement Contract
 * @dev Handles freeze/unfreeze logic, violation reporting, and multichain enforcement
 * @author Keval (Lead) & Aryan (Event Hooking)
 */
contract Cybercrime is AccessControl, ReentrancyGuard {
    
    // Roles
    bytes32 public constant ENFORCER_ROLE = keccak256("ENFORCER_ROLE");
    bytes32 public constant INVESTIGATOR_ROLE = keccak256("INVESTIGATOR_ROLE");
    bytes32 public constant BRIDGE_RELAY_ROLE = keccak256("BRIDGE_RELAY_ROLE");
    
    // Violation types
    enum ViolationType {
        RAPID_DUMP,
        FLASH_ATTACK,
        WASH_TRADING,
        PUMP_AND_DUMP,
        SUSPICIOUS_PATTERN,
        ML_DETECTED,
        MANUAL_REPORT
    }
    
    // Violation report structure
    struct ViolationReport {
        address violator;
        ViolationType violationType;
        string description;
        uint256 severity; // 0-100
        uint256 timestamp;
        address reporter;
        bool investigated;
        bool actionTaken;
        string actionDetails;
    }
    
    // Freeze record structure
    struct FreezeRecord {
        address account;
        string reason;
        uint256 frozenAt;
        address freezer;
        bool active;
        uint256 unfrozenAt;
        address unfreezer;
        uint256[] relatedReports;
    }
    
    // Storage
    IBlackHoleToken public token;
    mapping(uint256 => ViolationReport) public reports;
    mapping(address => FreezeRecord) public freezeRecords;
    mapping(address => uint256[]) public accountReports;
    uint256 public reportCounter;
    
    // Multichain freeze tracking
    mapping(address => mapping(uint256 => bool)) public multichainFrozen; // address => chainId => frozen
    
    // Events for logging and bridge relay
    event ViolationReported(
        uint256 indexed reportId,
        address indexed violator,
        ViolationType violationType,
        uint256 severity,
        address indexed reporter,
        uint256 timestamp
    );
    
    event AccountFrozen(
        address indexed account,
        string reason,
        address indexed freezer,
        uint256 timestamp,
        uint256[] reportIds
    );
    
    event AccountUnfrozen(
        address indexed account,
        address indexed unfreezer,
        uint256 timestamp
    );
    
    event MultichainFreezeTriggered(
        address indexed account,
        uint256 indexed chainId,
        string reason,
        uint256 timestamp
    );
    
    event ViolationInvestigated(
        uint256 indexed reportId,
        address indexed investigator,
        bool actionTaken,
        string details,
        uint256 timestamp
    );
    
    event BridgeReplayRequested(
        address indexed account,
        uint256 indexed originChain,
        uint256 indexed targetChain,
        bytes32 eventHash,
        uint256 timestamp
    );
    
    constructor(address _tokenAddress) {
        token = IBlackHoleToken(_tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ENFORCER_ROLE, msg.sender);
    }
    
    /**
     * @dev Report a violation
     * Can be called by ML system or manual investigators
     */
    function reportViolation(
        address violator,
        ViolationType violationType,
        string memory description,
        uint256 severity
    ) external returns (uint256 reportId) {
        require(severity <= 100, "CYB: Invalid severity");
        
        reportId = ++reportCounter;
        
        reports[reportId] = ViolationReport({
            violator: violator,
            violationType: violationType,
            description: description,
            severity: severity,
            timestamp: block.timestamp,
            reporter: msg.sender,
            investigated: false,
            actionTaken: false,
            actionDetails: ""
        });
        
        accountReports[violator].push(reportId);
        
        emit ViolationReported(
            reportId,
            violator,
            violationType,
            severity,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Freeze account based on violation
     * Triggers event for bridge replay to freeze on other chains
     */
    function freeze(address account, string memory reason) 
        external 
        onlyRole(ENFORCER_ROLE) 
        nonReentrant 
    {
        require(!token.isAccountFrozen(account), "CYB: Already frozen");
        
        // Get related reports
        uint256[] storage relatedReportIds = accountReports[account];
        
        // Freeze on token contract
        token.freezeAccount(account, reason);
        
        // Record freeze
        freezeRecords[account] = FreezeRecord({
            account: account,
            reason: reason,
            frozenAt: block.timestamp,
            freezer: msg.sender,
            active: true,
            unfrozenAt: 0,
            unfreezer: address(0),
            relatedReports: relatedReportIds
        });
        
        emit AccountFrozen(account, reason, msg.sender, block.timestamp, relatedReportIds);
        
        // Trigger multichain freeze
        _triggerMultichainFreeze(account, reason);
    }
    
    /**
     * @dev Unfreeze account (requires investigation)
     */
    function unfreeze(address account) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(token.isAccountFrozen(account), "CYB: Not frozen");
        
        FreezeRecord storage record = freezeRecords[account];
        record.active = false;
        record.unfrozenAt = block.timestamp;
        record.unfreezer = msg.sender;
        
        // Note: Actual unfreezing happens in token contract via multisig
        
        emit AccountUnfrozen(account, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Investigate violation report
     */
    function investigate(
        uint256 reportId,
        bool takeAction,
        string memory details
    ) external onlyRole(INVESTIGATOR_ROLE) {
        ViolationReport storage report = reports[reportId];
        require(!report.investigated, "CYB: Already investigated");
        
        report.investigated = true;
        report.actionTaken = takeAction;
        report.actionDetails = details;
        
        emit ViolationInvestigated(
            reportId,
            msg.sender,
            takeAction,
            details,
            block.timestamp
        );
        
        // If action is freeze, execute it
        if (takeAction) {
            if (!token.isAccountFrozen(report.violator)) {
                token.freezeAccount(report.violator, report.description);
            }
        }
    }
    
    /**
     * @dev Trigger freeze on multiple chains
     * Used by bridge relay system
     */
    function _triggerMultichainFreeze(address account, string memory reason) internal {
        // Emit events for common chains
        uint256[] memory chains = new uint256[](3);
        chains[0] = 1; // Ethereum
        chains[1] = 56; // BSC
        chains[2] = 137; // Polygon
        
        for (uint256 i = 0; i < chains.length; i++) {
            multichainFrozen[account][chains[i]] = true;
            emit MultichainFreezeTriggered(account, chains[i], reason, block.timestamp);
        }
    }
    
    /**
     * @dev Request bridge replay for freeze enforcement
     * Called when freeze event needs to propagate across chains
     */
    function requestBridgeReplay(
        address account,
        uint256 originChain,
        uint256 targetChain
    ) external onlyRole(BRIDGE_RELAY_ROLE) {
        bytes32 eventHash = keccak256(abi.encodePacked(account, originChain, targetChain, block.timestamp));
        
        emit BridgeReplayRequested(
            account,
            originChain,
            targetChain,
            eventHash,
            block.timestamp
        );
    }
    
    /**
     * @dev Get all reports for an account
     */
    function getAccountReports(address account) external view returns (uint256[] memory) {
        return accountReports[account];
    }
    
    /**
     * @dev Get violation report details
     */
    function getReport(uint256 reportId) external view returns (ViolationReport memory) {
        return reports[reportId];
    }
    
    /**
     * @dev Get freeze record
     */
    function getFreezeRecord(address account) external view returns (FreezeRecord memory) {
        return freezeRecords[account];
    }
    
    /**
     * @dev Check if account is frozen on specific chain
     */
    function isMultichainFrozen(address account, uint256 chainId) external view returns (bool) {
        return multichainFrozen[account][chainId];
    }
}

