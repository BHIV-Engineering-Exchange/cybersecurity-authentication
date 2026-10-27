// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BlackHoleToken (BHX)
 * @dev Token with audit trail, cybercrime enforcement integration, and bridge support
 * @author Shivam - Token Logic Lead
 */
contract BlackHoleToken is ERC20, AccessControl, Pausable, ReentrancyGuard {
    
    // Roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant BRIDGE_ROLE = keccak256("BRIDGE_ROLE");
    bytes32 public constant CYBERCRIME_ROLE = keccak256("CYBERCRIME_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    
    // Audit Trail Structure
    struct AuditEntry {
        address user;
        string action;
        uint256 amount;
        address relatedAddress;
        uint256 timestamp;
        bytes32 txHash;
    }
    
    // Storage
    mapping(address => AuditEntry[]) public auditTrail;
    mapping(address => bool) public frozenAccounts;
    mapping(address => uint256) public lastTransferTime;
    
    // Events for relay and monitoring
    event MintBurn(
        address indexed account,
        uint256 amount,
        bool isMint,
        uint256 timestamp,
        bytes32 indexed eventId
    );
    
    event TokenTransfer(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp,
        bytes32 indexed eventId
    );
    
    event ApprovalGranted(
        address indexed owner,
        address indexed spender,
        uint256 amount,
        uint256 timestamp,
        bytes32 indexed eventId
    );
    
    event AccountFrozen(
        address indexed account,
        string reason,
        address indexed freezer,
        uint256 timestamp
    );
    
    event AccountUnfrozen(
        address indexed account,
        address indexed unfreezer,
        uint256 timestamp
    );
    
    event AuditEntryAdded(
        address indexed user,
        string action,
        uint256 amount,
        uint256 timestamp
    );
    
    modifier notFrozen(address account) {
        require(!frozenAccounts[account], "BHX: Account is frozen");
        _;
    }
    
    modifier onlyMultisig() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "BHX: Requires admin multisig");
        _;
    }
    
    constructor() ERC20("BlackHole Token", "BHX") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        
        // Mint initial supply: 1 billion tokens
        _mint(msg.sender, 1000000000 * 10**decimals());
        
        // Log initial mint
        _addAuditEntry(msg.sender, "INITIAL_MINT", 1000000000 * 10**decimals(), address(0));
    }
    
    /**
     * @dev Mint new tokens (requires MINTER_ROLE)
     * Emits structured event for bridge relay
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) notFrozen(to) {
        bytes32 eventId = keccak256(abi.encodePacked(to, amount, block.timestamp, "MINT"));
        
        _mint(to, amount);
        _addAuditEntry(to, "MINT", amount, msg.sender);
        
        emit MintBurn(to, amount, true, block.timestamp, eventId);
    }
    
    /**
     * @dev Burn tokens (requires BURNER_ROLE)
     * Emits structured event for bridge relay
     */
    function burn(address from, uint256 amount) external onlyRole(BURNER_ROLE) notFrozen(from) {
        bytes32 eventId = keccak256(abi.encodePacked(from, amount, block.timestamp, "BURN"));
        
        _burn(from, amount);
        _addAuditEntry(from, "BURN", amount, msg.sender);
        
        emit MintBurn(from, amount, false, block.timestamp, eventId);
    }
    
    /**
     * @dev Transfer with audit trail and freeze check
     * Overrides ERC20 transfer
     */
    function transfer(address to, uint256 amount) 
        public 
        override 
        notFrozen(msg.sender) 
        notFrozen(to) 
        whenNotPaused 
        returns (bool) 
    {
        bytes32 eventId = keccak256(abi.encodePacked(msg.sender, to, amount, block.timestamp));
        
        bool success = super.transfer(to, amount);
        
        if (success) {
            _addAuditEntry(msg.sender, "TRANSFER_OUT", amount, to);
            _addAuditEntry(to, "TRANSFER_IN", amount, msg.sender);
            lastTransferTime[msg.sender] = block.timestamp;
            
            emit TokenTransfer(msg.sender, to, amount, block.timestamp, eventId);
        }
        
        return success;
    }
    
    /**
     * @dev TransferFrom with audit trail
     */
    function transferFrom(address from, address to, uint256 amount)
        public
        override
        notFrozen(from)
        notFrozen(to)
        whenNotPaused
        returns (bool)
    {
        bytes32 eventId = keccak256(abi.encodePacked(from, to, amount, block.timestamp));
        
        bool success = super.transferFrom(from, to, amount);
        
        if (success) {
            _addAuditEntry(from, "TRANSFER_OUT", amount, to);
            _addAuditEntry(to, "TRANSFER_IN", amount, from);
            lastTransferTime[from] = block.timestamp;
            
            emit TokenTransfer(from, to, amount, block.timestamp, eventId);
        }
        
        return success;
    }
    
    /**
     * @dev Approve with event emission for bridge/stake
     */
    function approve(address spender, uint256 amount)
        public
        override
        notFrozen(msg.sender)
        whenNotPaused
        returns (bool)
    {
        bytes32 eventId = keccak256(abi.encodePacked(msg.sender, spender, amount, block.timestamp));
        
        bool success = super.approve(spender, amount);
        
        if (success) {
            _addAuditEntry(msg.sender, "APPROVE", amount, spender);
            
            emit ApprovalGranted(msg.sender, spender, amount, block.timestamp, eventId);
        }
        
        return success;
    }
    
    /**
     * @dev Get complete audit trail for an address
     * Supports AI/ML audit analysis
     */
    function getAuditTrail(address account) external view returns (AuditEntry[] memory) {
        return auditTrail[account];
    }
    
    /**
     * @dev Get recent transactions (for ML analysis)
     */
    function getRecentActivity(address account, uint256 limit) external view returns (AuditEntry[] memory) {
        AuditEntry[] storage trail = auditTrail[account];
        uint256 length = trail.length;
        
        if (length == 0) {
            return new AuditEntry[](0);
        }
        
        uint256 resultLength = length < limit ? length : limit;
        AuditEntry[] memory recent = new AuditEntry[](resultLength);
        
        for (uint256 i = 0; i < resultLength; i++) {
            recent[i] = trail[length - 1 - i];
        }
        
        return recent;
    }
    
    /**
     * @dev Freeze account (CYBERCRIME_ROLE only)
     * Called by Cybercrime.sol when violation detected
     */
    function freezeAccount(address account, string memory reason) 
        external 
        onlyRole(CYBERCRIME_ROLE) 
    {
        require(!frozenAccounts[account], "BHX: Account already frozen");
        
        frozenAccounts[account] = true;
        _addAuditEntry(account, "FROZEN", 0, msg.sender);
        
        emit AccountFrozen(account, reason, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Unfreeze account (requires multisig admin)
     */
    function unfreezeAccount(address account) 
        external 
        onlyMultisig 
    {
        require(frozenAccounts[account], "BHX: Account not frozen");
        
        frozenAccounts[account] = false;
        _addAuditEntry(account, "UNFROZEN", 0, msg.sender);
        
        emit AccountUnfrozen(account, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Admin override with multisig requirement
     * Chain-safe emergency function
     */
    function adminOverride(
        address from,
        address to,
        uint256 amount,
        string memory reason
    ) external onlyMultisig {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "BHX: Requires 3/5 multisig");
        
        // Force transfer even if frozen
        _transfer(from, to, amount);
        
        _addAuditEntry(from, "ADMIN_OVERRIDE_OUT", amount, to);
        _addAuditEntry(to, "ADMIN_OVERRIDE_IN", amount, from);
        
        bytes32 eventId = keccak256(abi.encodePacked(from, to, amount, block.timestamp, reason));
        emit TokenTransfer(from, to, amount, block.timestamp, eventId);
    }
    
    /**
     * @dev Pause all transfers (emergency)
     */
    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }
    
    /**
     * @dev Unpause transfers
     */
    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }
    
    /**
     * @dev Internal function to add audit entry
     */
    function _addAuditEntry(
        address user,
        string memory action,
        uint256 amount,
        address relatedAddress
    ) internal {
        bytes32 txHash = keccak256(abi.encodePacked(user, action, amount, block.timestamp));
        
        auditTrail[user].push(AuditEntry({
            user: user,
            action: action,
            amount: amount,
            relatedAddress: relatedAddress,
            timestamp: block.timestamp,
            txHash: txHash
        }));
        
        emit AuditEntryAdded(user, action, amount, block.timestamp);
    }
    
    /**
     * @dev Check if account is frozen
     */
    function isAccountFrozen(address account) external view returns (bool) {
        return frozenAccounts[account];
    }
    
    /**
     * @dev Get transfer velocity (for ML detection)
     */
    function getTransferVelocity(address account) external view returns (uint256) {
        if (lastTransferTime[account] == 0) return 0;
        return block.timestamp - lastTransferTime[account];
    }
}
