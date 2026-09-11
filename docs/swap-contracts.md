# Swap Contracts Documentation

## Overview

The P0 Swap implementation uses real deployed contracts on **current Monad Testnet** (chain ID 10143, post-2025-12-16 reset) to swap between native MON and USDC via a **Uniswap V2-compatible community router** (PuddleSwap deployment).

**Important**: Monad testnet was reset on 2025-12-16. Many older contract addresses (including previous official Uniswap deployments) now have **no bytecode** and are unusable.

## Verified Live Contracts

All addresses below were verified via `eth_getCode` RPC calls on **2026-09-11** against `https://testnet-rpc.monad.xyz`.

### Uniswap V2-style Router (PuddleSwap)
- **Address**: `0x430c23895c8D44883526e3E0B09327dAD8766660`
- **Bytecode**: ✅ 35,890 bytes (non-empty, confirmed live)
- **Source**: Community V2 fork deployed post-testnet-reset
- **Functions Used**:
  - `swapExactETHForTokens`: Swap MON → USDC
  - `swapExactTokensForETH`: Swap USDC → MON
  - `getAmountsOut`: Get quote for swap amount
  - `WETH()`: Returns `0x97b3070f9da6c002343862b35e68bd8e22608943`
  - `factory()`: Returns `0xd498f5bebd0c9f1fe0135a0cf942da67ee6e8a9b`

### WMON (Router's Wrapped MON)
- **Address**: `0x97b3070f9da6c002343862b35e68bd8e22608943`
- **Bytecode**: ✅ 4,618 bytes (non-empty, confirmed live)
- **Note**: This is the WETH address used by the router, **NOT** the canonical WMON (`0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541`)
- **Purpose**: Used as intermediate token in swap path (MON wraps to WMON automatically in router)

### USDC Test Token
- **Address**: `0x534b2f3A21130d7a60830c2Df862319e593943A3`
- **Bytecode**: ✅ 3,598 bytes (non-empty, confirmed live)
- **Decimals**: 6
- **Functions Used**:
  - `approve`: Grant router allowance to spend USDC
  - `balanceOf`: Read user's USDC balance
  - `allowance`: Check current router allowance

### Factory
- **Address**: `0xd498f5bebd0c9f1fe0135a0cf942da67ee6e8a9b`
- **Bytecode**: ✅ 21,646 bytes (non-empty, confirmed live)
- **Purpose**: Manages liquidity pool creation and lookup

## RPC Verification Proof

### 1. Contract Bytecode Verification

```bash
# Router
curl -X POST https://testnet-rpc.monad.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x430c23895c8D44883526e3E0B09327dAD8766660","latest"],"id":1}'
# Result: 0x60806040526004361061014f... (35,890 bytes)

# WMON
curl -X POST https://testnet-rpc.monad.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x97b3070f9da6c002343862b35e68bd8e22608943","latest"],"id":1}'
# Result: 0x60806040526004361061009d... (4,618 bytes)

# USDC
curl -X POST https://testnet-rpc.monad.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x534b2f3A21130d7a60830c2Df862319e593943A3","latest"],"id":1}'
# Result: 0x60806040526004361061005a... (3,598 bytes)
```

### 2. Live Quote Test

**Test**: 0.001 MON (1e15 wei) → USDC

```bash
# getAmountsOut(1000000000000000, [WMON, USDC])
curl -X POST https://testnet-rpc.monad.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_call",
    "params":[{
      "to":"0x430c23895c8D44883526e3E0B09327dAD8766660",
      "data":"0xd06ca61f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000038d7ea4c680000000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000200000000000000000000000097b3070f9da6c002343862b35e68bd8e22608943000000000000000000000000534b2f3A21130d7a60830c2Df862319e593943A3"
    },"latest"],
    "id":1
  }'
```

**Result**:
```json
{
  "jsonrpc": "2.0",
  "result": "0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000038d7ea4c6800000000000000000000000000000000000000000000000000000000000000011e9",
  "id": 1
}
```

**Decoded**:
- `amounts[0]` = `0x038d7ea4c68000` = 1,000,000,000,000,000 (input: 0.001 MON)
- `amounts[1]` = `0x11e9` = 4,585 (output: 0.004585 USDC with 6 decimals)

✅ **Quote successful** — liquidity pool is live and functional.

## Swap Paths

### MON → USDC
1. User sends MON (native token) with transaction value
2. Router wraps MON → WMON automatically
3. Router swaps WMON → USDC via the WMON/USDC pool
4. USDC sent to user's address

**Path**: `[0x97b3070f9da6c002343862b35e68bd8e22608943, 0x534b2f3A21130d7a60830c2Df862319e593943A3]`

### USDC → MON
1. User approves router to spend USDC (if needed)
2. Router swaps USDC → WMON via the WMON/USDC pool
3. Router unwraps WMON → MON automatically
4. MON sent to user's address

**Path**: `[0x534b2f3A21130d7a60830c2Df862319e593943A3, 0x97b3070f9da6c002343862b35e68bd8e22608943]`

## Implementation Details

### Slippage Protection
- Default slippage tolerance: 2%
- Minimum output amount calculated as: `quote * (100 - slippage) / 100`
- Validated in tests: `tests/swap.test.ts`

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

## Dead Addresses (Historical Reference)

These addresses **do NOT work** on current testnet (post-2025-12-16 reset):

| Contract | Address | Status |
|----------|---------|--------|
| Old Official Uniswap V2 Router | `0x4b2ab38dbf28d31d467aa8993f6c2585981d6804` | ❌ No bytecode |
| Old USDC | `0x754704Bc059F8C67012fEd69BC8A327a5aafb603` | ❌ No bytecode |
| Old Pool | `0x659bD0BC4167BA25c62E05656F78043E7eD4a9da` | ❌ No bytecode |
| Older Router | `0xfb8e1c3b833f9e67a71c859a132cf783b645e436` | ❌ No bytecode |

**These appear on mainnet explorers but are dead on current testnet.**

## Testnet Explorers

- **MonadVision**: https://testnet.monadvision.com
- **Monadscan**: https://testnet.monadscan.com
- **MonadExplorer**: https://testnet.monadexplorer.com

## Re-Verification Checklist

To independently verify these contracts remain live:

```bash
# 1. Check each address has bytecode
for addr in \
  0x430c23895c8D44883526e3E0B09327dAD8766660 \
  0x97b3070f9da6c002343862b35e68bd8e22608943 \
  0x534b2f3A21130d7a60830c2Df862319e593943A3 \
  0xd498f5bebd0c9f1fe0135a0cf942da67ee6e8a9b
do
  echo "Checking $addr"
  curl -s -X POST https://testnet-rpc.monad.xyz \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$addr\",\"latest\"],\"id\":1}" \
    | jq -r '.result' | head -c 20
  echo
done

# 2. Test a quote (0.001 MON -> USDC)
# Use the curl command from section 2 above
# Verify result is non-zero and decodes to reasonable USDC amount
```

If any address returns `0x` (empty bytecode), the testnet may have been reset again and new deployments must be found.

## Testing Verification

Unit tests verify:
- Contract address format and expected values (`tests/swap.test.ts`)
- Swap path construction for both directions
- Slippage calculation math with edge cases

Pure swap logic is tested without Passkey dependency. End-to-end swap execution requires:
- Valid Monad testnet connection
- User account with MON balance (from faucet: https://faucet.monad.xyz)
- Active Signing Session (Passkey ceremony)

## Summary

✅ All contracts verified live on current Monad testnet (2026-09-11)  
✅ Quote call successful with real liquidity  
✅ Path construction and slippage math validated in tests  
✅ RPC proof provided for independent verification

**Next testnet reset**: If contracts become dead (`eth_getCode` returns `0x`), rediscover live deployments following the same verification process.
