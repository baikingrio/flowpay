#!/usr/bin/env bash
set -euo pipefail
: "${DEPLOYER_PRIVATE_KEY:?Set DEPLOYER_PRIVATE_KEY to a Monad testnet key with MON}"
forge create contracts/MockUSDC.sol:MockUSDC \
  --rpc-url https://testnet-rpc.monad.xyz \
  --private-key "$DEPLOYER_PRIVATE_KEY" \
  --broadcast
