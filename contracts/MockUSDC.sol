// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @notice Testnet-only mock USDC (6 decimals) with a public claim faucet.
/// Not Circle USDC. For Flowpay demos when official test USDC is scarce.
contract MockUSDC {
    string public constant name = "Mock USDC";
    string public constant symbol = "mUSDC";
    uint8 public constant decimals = 6;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    /// 100 mUSDC per claim.
    uint256 public constant CLAIM_AMOUNT = 100 * 10 ** 6;
    mapping(address => uint256) public lastClaimAt;
    uint256 public constant CLAIM_COOLDOWN = 30 minutes;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event Claimed(address indexed account, uint256 amount);

    function claim() external {
        require(
            block.timestamp >= lastClaimAt[msg.sender] + CLAIM_COOLDOWN,
            "MockUSDC: cooldown"
        );
        lastClaimAt[msg.sender] = block.timestamp;
        _mint(msg.sender, CLAIM_AMOUNT);
        emit Claimed(msg.sender, CLAIM_AMOUNT);
    }

    /// @dev Optional maintainer top-up to any address (no access control — testnet demo only).
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        require(allowed >= amount, "MockUSDC: allowance");
        if (allowed != type(uint256).max) {
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal {
        require(to != address(0), "MockUSDC: mint zero");
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(to != address(0), "MockUSDC: transfer zero");
        uint256 bal = balanceOf[from];
        require(bal >= amount, "MockUSDC: balance");
        unchecked {
            balanceOf[from] = bal - amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }
}
