# Swap Contracts Documentation

## Overview

The P0 Swap implementation uses real deployed contracts on Monad Testnet (chain ID 10143) to swap between native MON and USDC via Uniswap V2.

## Contracts Used

### Uniswap V2 Router02
- **Address**: `0x4b2ab38dbf28d31d467aa8993f6c2585981d6804`
- **Source**: Official Uniswap V2 deployment on Monad testnet
- **Verification**: [Uniswap V2 Deployments Documentation](https://developers.uniswap.org/docs/protocols/v2/deployments)
- **Functions Used**:
  - `swapExactETHForTokens`: Swap MON → USDC
  - `swapExactTokensForETH`: Swap USDC → MON
  - `getAmountsOut`: Get quote for swap amount

### WMON (Wrapped MON)
- **Address**: `0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541`
- **Source**: Official Monad testnet canonical contract
- **Verification**: [Monad Testnet Documentation](https://docs.monad.xyz/developer-essentials/testnet)
- **Purpose**: Used as intermediate token in swap path (MON wraps to WMON automatically in router)

### USDC Test Token
- **Address**: `0x754704Bc059F8C67012fEd69BC8A327a5aafb603`
- **Source**: Active USDC token with liquidity on Uniswap
- **Verification**: 
  - [Uniswap Token Explorer](https://app.uniswap.org/explore/tokens/monad/0x754704Bc059F8C67012fEd69BC8A327a5aafb603)
  - [MON/USDC Pool](https://app.uniswap.org/explore/pools/monad/0x659bD0BC4167BA25c62E05656F78043E7eD4a9da)
- **Decimals**: 6
- **Functions Used**:
  - `approve`: Grant router allowance to spend USDC
  - `balanceOf`: Read user's USDC balance
  - `allowance`: Check current router allowance

## Swap Paths

### MON → USDC
1. User sends MON (native token) with transaction value
2. Router wraps MON → WMON automatically
3. Router swaps WMON → USDC via the MON/USDC pool
4. USDC sent to user's address

**Path**: `[WMON, USDC]`

### USDC → MON
1. User approves router to spend USDC (if needed)
2. Router swaps USDC → WMON via the MON/USDC pool
3. Router unwraps WMON → MON automatically
4. MON sent to user's address

**Path**: `[USDC, WMON]`

## Pool Verification

- **MON/USDC Pool Address**: `0x659bD0BC4167BA25c62E05656F78043E7eD4a9da`
- **Liquidity**: 33.3M MON + 435.5K USDC (as of deployment)
- **Explorer**: [MonadVision](https://monadvision.com/address/0x659bD0BC4167BA25c62E05656F78043E7eD4a9da)

## Implementation Details

### Slippage Protection
- Default slippage tolerance: 2%
- Minimum output amount calculated as: `quote * (100 - slippage) / 100`

### Deadline
- Set to current timestamp + 5 minutes (300 seconds)
- Protects against transaction sitting in mempool too long

### Approval Flow (USDC → MON only)
1. Check current allowance for router
2. If allowance < swap amount, approve exact amount needed
3. Wait for approval transaction to confirm
4. Execute swap

### No Approval Needed (MON → USDC)
- Native token sent as transaction value
- No ERC-20 approval required

## Testing Verification

The implementation includes unit tests for:
- Contract address validation (correct format and values)
- Swap direction types (monToUsdc, usdcToMon)

Pure swap logic is tested without Passkey dependency. End-to-end swap execution requires:
- Valid Monad testnet connection
- User account with MON balance (from faucet)
- Active Signing Session (Passkey ceremony)

## References

1. Uniswap V2 Router documentation
2. Monad testnet official documentation
3. Verified pool and token addresses on Uniswap explore interface
4. MonadVision and Monadscan block explorers
