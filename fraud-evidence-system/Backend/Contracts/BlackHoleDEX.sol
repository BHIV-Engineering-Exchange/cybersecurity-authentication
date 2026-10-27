// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title BlackHoleDEX
 * @dev Automated Market Maker (AMM) DEX for BHX token with slippage protection
 * @author Nihal - DEX Lead
 */
contract BlackHoleDEX is Ownable, ReentrancyGuard, Pausable {
    
    // Pool structure
    struct LiquidityPool {
        address tokenA;
        address tokenB;
        uint256 reserveA;
        uint256 reserveB;
        uint256 totalShares;
        uint256 lastUpdate;
        bool active;
    }
    
    // OTC Trade structure
    struct OTCTrade {
        address seller;
        address buyer;
        address token;
        uint256 amount;
        uint256 price;
        bool completed;
        uint256 expiresAt;
        uint256 requiredSignatures;
        mapping(address => bool) signatures;
        uint256 signatureCount;
    }
    
    // Storage
    mapping(bytes32 => LiquidityPool) public pools;
    mapping(address => mapping(bytes32 => uint256)) public liquidityShares;
    mapping(uint256 => OTCTrade) public otcTrades;
    uint256 public otcTradeCounter;
    
    // Configuration
    uint256 public constant FEE_DENOMINATOR = 10000;
    uint256 public swapFee = 30; // 0.3%
    uint256 public maxSlippage = 500; // 5%
    
    // Events
    event PoolCreated(
        bytes32 indexed poolId,
        address indexed tokenA,
        address indexed tokenB,
        uint256 timestamp
    );
    
    event LiquidityAdded(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 shares,
        uint256 timestamp
    );
    
    event LiquidityRemoved(
        bytes32 indexed poolId,
        address indexed provider,
        uint256 amountA,
        uint256 amountB,
        uint256 shares,
        uint256 timestamp
    );
    
    event Swap(
        bytes32 indexed poolId,
        address indexed trader,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        uint256 fee,
        uint256 slippage,
        uint256 timestamp
    );
    
    event OTCTradeCreated(
        uint256 indexed tradeId,
        address indexed seller,
        address token,
        uint256 amount,
        uint256 price,
        uint256 expiresAt
    );
    
    event OTCTradeSigned(
        uint256 indexed tradeId,
        address indexed signer,
        uint256 signatureCount
    );
    
    event OTCTradeCompleted(
        uint256 indexed tradeId,
        address indexed seller,
        address indexed buyer,
        uint256 amount
    );
    
    event FlashAttackDetected(
        bytes32 indexed poolId,
        address indexed attacker,
        uint256 priceImpact,
        uint256 timestamp
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new liquidity pool
     */
    function createPool(address tokenA, address tokenB) external onlyOwner returns (bytes32) {
        require(tokenA != tokenB, "DEX: Identical tokens");
        require(tokenA != address(0) && tokenB != address(0), "DEX: Zero address");
        
        bytes32 poolId = keccak256(abi.encodePacked(tokenA, tokenB));
        require(!pools[poolId].active, "DEX: Pool exists");
        
        pools[poolId] = LiquidityPool({
            tokenA: tokenA,
            tokenB: tokenB,
            reserveA: 0,
            reserveB: 0,
            totalShares: 0,
            lastUpdate: block.timestamp,
            active: true
        });
        
        emit PoolCreated(poolId, tokenA, tokenB, block.timestamp);
        return poolId;
    }
    
    /**
     * @dev Add liquidity to pool
     */
    function addLiquidity(
        bytes32 poolId,
        uint256 amountA,
        uint256 amountB
    ) external nonReentrant whenNotPaused returns (uint256 shares) {
        LiquidityPool storage pool = pools[poolId];
        require(pool.active, "DEX: Pool not active");
        
        // Transfer tokens from user
        IERC20(pool.tokenA).transferFrom(msg.sender, address(this), amountA);
        IERC20(pool.tokenB).transferFrom(msg.sender, address(this), amountB);
        
        // Calculate shares
        if (pool.totalShares == 0) {
            shares = sqrt(amountA * amountB);
        } else {
            uint256 sharesA = (amountA * pool.totalShares) / pool.reserveA;
            uint256 sharesB = (amountB * pool.totalShares) / pool.reserveB;
            shares = sharesA < sharesB ? sharesA : sharesB;
        }
        
        require(shares > 0, "DEX: Insufficient liquidity");
        
        // Update pool
        pool.reserveA += amountA;
        pool.reserveB += amountB;
        pool.totalShares += shares;
        pool.lastUpdate = block.timestamp;
        
        liquidityShares[msg.sender][poolId] += shares;
        
        emit LiquidityAdded(poolId, msg.sender, amountA, amountB, shares, block.timestamp);
    }
    
    /**
     * @dev Remove liquidity from pool
     */
    function removeLiquidity(bytes32 poolId, uint256 shares) 
        external 
        nonReentrant 
        returns (uint256 amountA, uint256 amountB) 
    {
        LiquidityPool storage pool = pools[poolId];
        require(pool.active, "DEX: Pool not active");
        require(liquidityShares[msg.sender][poolId] >= shares, "DEX: Insufficient shares");
        
        // Calculate amounts
        amountA = (shares * pool.reserveA) / pool.totalShares;
        amountB = (shares * pool.reserveB) / pool.totalShares;
        
        require(amountA > 0 && amountB > 0, "DEX: Insufficient liquidity");
        
        // Update pool
        pool.reserveA -= amountA;
        pool.reserveB -= amountB;
        pool.totalShares -= shares;
        pool.lastUpdate = block.timestamp;
        
        liquidityShares[msg.sender][poolId] -= shares;
        
        // Transfer tokens to user
        IERC20(pool.tokenA).transfer(msg.sender, amountA);
        IERC20(pool.tokenB).transfer(msg.sender, amountB);
        
        emit LiquidityRemoved(poolId, msg.sender, amountA, amountB, shares, block.timestamp);
    }
    
    /**
     * @dev Swap tokens with slippage protection
     * Includes flash attack detection
     */
    function swap(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn,
        uint256 minAmountOut
    ) external nonReentrant whenNotPaused returns (uint256 amountOut) {
        LiquidityPool storage pool = pools[poolId];
        require(pool.active, "DEX: Pool not active");
        require(tokenIn == pool.tokenA || tokenIn == pool.tokenB, "DEX: Invalid token");
        require(amountIn > 0, "DEX: Zero amount");
        
        // Determine input/output reserves
        bool isTokenA = tokenIn == pool.tokenA;
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;
        address tokenOut = isTokenA ? pool.tokenB : pool.tokenA;
        
        // Calculate output with fee
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - swapFee);
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
        
        require(amountOut > 0, "DEX: Insufficient output");
        require(amountOut >= minAmountOut, "DEX: Slippage exceeded");
        
        // Calculate slippage and check for flash attack
        uint256 priceImpact = (amountOut * 10000) / reserveOut;
        if (priceImpact > 1000) { // > 10% price impact
            emit FlashAttackDetected(poolId, msg.sender, priceImpact, block.timestamp);
        }
        
        // Slippage protection
        uint256 actualSlippage = ((reserveOut - amountOut) * 10000) / reserveOut;
        require(actualSlippage <= maxSlippage, "DEX: Slippage protection triggered");
        
        // Update reserves
        if (isTokenA) {
            pool.reserveA += amountIn;
            pool.reserveB -= amountOut;
        } else {
            pool.reserveB += amountIn;
            pool.reserveA -= amountOut;
        }
        pool.lastUpdate = block.timestamp;
        
        // Execute swap
        IERC20(tokenIn).transferFrom(msg.sender, address(this), amountIn);
        IERC20(tokenOut).transfer(msg.sender, amountOut);
        
        uint256 fee = (amountIn * swapFee) / FEE_DENOMINATOR;
        
        emit Swap(
            poolId,
            msg.sender,
            tokenIn,
            tokenOut,
            amountIn,
            amountOut,
            fee,
            actualSlippage,
            block.timestamp
        );
    }
    
    /**
     * @dev Create OTC trade with multisig requirement
     */
    function createOTCTrade(
        address token,
        uint256 amount,
        uint256 price,
        uint256 duration,
        uint256 requiredSignatures
    ) external returns (uint256 tradeId) {
        require(requiredSignatures >= 3 && requiredSignatures <= 5, "DEX: Invalid sig requirement");
        
        tradeId = ++otcTradeCounter;
        OTCTrade storage trade = otcTrades[tradeId];
        
        trade.seller = msg.sender;
        trade.token = token;
        trade.amount = amount;
        trade.price = price;
        trade.completed = false;
        trade.expiresAt = block.timestamp + duration;
        trade.requiredSignatures = requiredSignatures;
        trade.signatureCount = 0;
        
        // Lock tokens
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        emit OTCTradeCreated(tradeId, msg.sender, token, amount, price, trade.expiresAt);
    }
    
    /**
     * @dev Sign OTC trade (multisig)
     */
    function signOTCTrade(uint256 tradeId) external {
        OTCTrade storage trade = otcTrades[tradeId];
        require(!trade.completed, "DEX: Trade completed");
        require(block.timestamp < trade.expiresAt, "DEX: Trade expired");
        require(!trade.signatures[msg.sender], "DEX: Already signed");
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "DEX: Not authorized");
        
        trade.signatures[msg.sender] = true;
        trade.signatureCount++;
        
        emit OTCTradeSigned(tradeId, msg.sender, trade.signatureCount);
    }
    
    /**
     * @dev Execute OTC trade with buyer
     */
    function executeOTCTrade(uint256 tradeId) external payable nonReentrant {
        OTCTrade storage trade = otcTrades[tradeId];
        require(!trade.completed, "DEX: Trade completed");
        require(block.timestamp < trade.expiresAt, "DEX: Trade expired");
        require(trade.signatureCount >= trade.requiredSignatures, "DEX: Insufficient signatures");
        require(msg.value >= trade.price, "DEX: Insufficient payment");
        
        trade.buyer = msg.sender;
        trade.completed = true;
        
        // Transfer tokens to buyer
        IERC20(trade.token).transfer(msg.sender, trade.amount);
        
        // Transfer payment to seller
        payable(trade.seller).transfer(trade.price);
        
        // Refund excess payment
        if (msg.value > trade.price) {
            payable(msg.sender).transfer(msg.value - trade.price);
        }
        
        emit OTCTradeCompleted(tradeId, trade.seller, msg.sender, trade.amount);
    }
    
    /**
     * @dev Get pool health metrics
     */
    function getPoolHealth(bytes32 poolId) external view returns (
        uint256 liquidityScore,
        uint256 imbalanceRatio,
        uint256 utilizationRate,
        bool isHealthy
    ) {
        LiquidityPool storage pool = pools[poolId];
        require(pool.active, "DEX: Pool not active");
        
        // Calculate metrics
        uint256 totalLiquidity = pool.reserveA + pool.reserveB;
        imbalanceRatio = (pool.reserveA * 10000) / pool.reserveB;
        utilizationRate = (pool.totalShares * 10000) / totalLiquidity;
        
        // Health score (0-100)
        if (imbalanceRatio > 8000 && imbalanceRatio < 12000) {
            liquidityScore = 100;
        } else if (imbalanceRatio > 5000 && imbalanceRatio < 15000) {
            liquidityScore = 70;
        } else {
            liquidityScore = 30;
        }
        
        isHealthy = liquidityScore >= 70 && pool.reserveA > 0 && pool.reserveB > 0;
    }
    
    /**
     * @dev Calculate swap output amount (view function)
     */
    function getAmountOut(
        bytes32 poolId,
        address tokenIn,
        uint256 amountIn
    ) external view returns (uint256 amountOut, uint256 priceImpact) {
        LiquidityPool storage pool = pools[poolId];
        require(pool.active, "DEX: Pool not active");
        
        bool isTokenA = tokenIn == pool.tokenA;
        uint256 reserveIn = isTokenA ? pool.reserveA : pool.reserveB;
        uint256 reserveOut = isTokenA ? pool.reserveB : pool.reserveA;
        
        uint256 amountInWithFee = amountIn * (FEE_DENOMINATOR - swapFee);
        amountOut = (amountInWithFee * reserveOut) / (reserveIn * FEE_DENOMINATOR + amountInWithFee);
        
        priceImpact = (amountOut * 10000) / reserveOut;
    }
    
    /**
     * @dev Set slippage protection level
     */
    function setMaxSlippage(uint256 _maxSlippage) external onlyOwner {
        require(_maxSlippage <= 1000, "DEX: Slippage too high"); // Max 10%
        maxSlippage = _maxSlippage;
    }
    
    /**
     * @dev Set swap fee
     */
    function setSwapFee(uint256 _swapFee) external onlyOwner {
        require(_swapFee <= 100, "DEX: Fee too high"); // Max 1%
        swapFee = _swapFee;
    }
    
    /**
     * @dev Pause all trading (emergency)
     */
    function pauseTrading() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause trading
     */
    function unpauseTrading() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Square root function (for liquidity calculation)
     */
    function sqrt(uint256 x) internal pure returns (uint256 y) {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}

