import { createPublicClient, createWalletClient, encodeFunctionData, http, type Address } from 'viem'
import { toViemAccount } from '@category-labs/mera/viem'
import type { Secp256k1SigningSession } from '@category-labs/mera'

import { chain } from './chain'

/**
 * Uniswap V2-style Router on Monad Testnet (PuddleSwap deployment).
 * Verified: eth_getCode returns non-empty bytecode (35890 bytes)
 * RPC: https://testnet-rpc.monad.xyz
 */
const UNISWAP_V2_ROUTER = '0x430c23895c8D44883526e3E0B09327dAD8766660' as const

/**
 * USDC test token on Monad Testnet.
 * Verified: eth_getCode returns non-empty bytecode (3598 bytes)
 * Has liquidity pool with WMON via above router
 */
const USDC_ADDRESS = '0x534b2f3A21130d7a60830c2Df862319e593943A3' as const

/**
 * WMON (Wrapped MON) used by the router as WETH.
 * Verified: eth_getCode returns non-empty bytecode (4618 bytes)
 * This is the WETH address returned by router.WETH(), not the canonical WMON
 */
const WMON_ADDRESS = '0x97b3070f9da6c002343862b35e68bd8e22608943' as const

export type SwapDirection = 'monToUsdc' | 'usdcToMon'

const ERC20_ABI = [
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

export function getPublicClient() {
  return createPublicClient({
    chain,
    transport: http(),
  })
}

export async function readUsdcBalance(address: Address): Promise<bigint> {
  const client = getPublicClient()
  return client.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  })
}

export async function readUsdcAllowance(owner: Address, spender: Address): Promise<bigint> {
  const client = getPublicClient()
  return client.readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
  })
}

export async function getAmountOut(
  amountIn: bigint,
  direction: SwapDirection,
): Promise<{ amount: bigint, error?: string }> {
  const client = getPublicClient()
  const path = direction === 'monToUsdc'
    ? [WMON_ADDRESS, USDC_ADDRESS]
    : [USDC_ADDRESS, WMON_ADDRESS]

  try {
    const result = await client.readContract({
      address: UNISWAP_V2_ROUTER,
      abi: [{
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'path', type: 'address[]' },
        ],
        name: 'getAmountsOut',
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'view',
        type: 'function',
      }],
      functionName: 'getAmountsOut',
      args: [amountIn, path],
    })
    const lastAmount = result[result.length - 1]
    if (!lastAmount || lastAmount === 0n)
      return { amount: 0n, error: 'No liquidity' }
    return { amount: lastAmount }
  }
  catch (error) {
    return { amount: 0n, error: error instanceof Error ? error.message : 'Quote failed' }
  }
}

export async function approveUsdc(
  session: Secp256k1SigningSession,
  amount: bigint,
): Promise<`0x${string}`> {
  const account = toViemAccount(session)
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(),
  })

  const hash = await wallet.writeContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [UNISWAP_V2_ROUTER, amount],
  })

  const receipt = await getPublicClient().waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success')
    throw new Error('Approval failed')

  return hash
}

export async function swapExactETHForTokens(
  session: Secp256k1SigningSession,
  amountIn: bigint,
  amountOutMin: bigint,
  deadline: bigint,
): Promise<`0x${string}`> {
  const account = toViemAccount(session)
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(),
  })

  const path = [WMON_ADDRESS, USDC_ADDRESS]
  const to = account.address

  return wallet.sendTransaction({
    to: UNISWAP_V2_ROUTER,
    value: amountIn,
    data: encodeFunctionData({
      abi: [{
        inputs: [
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'path', type: 'address[]' },
          { name: 'to', type: 'address' },
          { name: 'deadline', type: 'uint256' },
        ],
        name: 'swapExactETHForTokens',
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'payable',
        type: 'function',
      }],
      functionName: 'swapExactETHForTokens',
      args: [amountOutMin, path, to, deadline],
    }),
  })
}

export async function swapExactTokensForETH(
  session: Secp256k1SigningSession,
  amountIn: bigint,
  amountOutMin: bigint,
  deadline: bigint,
): Promise<`0x${string}`> {
  const account = toViemAccount(session)
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(),
  })

  const path = [USDC_ADDRESS, WMON_ADDRESS]
  const to = account.address

  return wallet.sendTransaction({
    to: UNISWAP_V2_ROUTER,
    data: encodeFunctionData({
      abi: [{
        inputs: [
          { name: 'amountIn', type: 'uint256' },
          { name: 'amountOutMin', type: 'uint256' },
          { name: 'path', type: 'address[]' },
          { name: 'to', type: 'address' },
          { name: 'deadline', type: 'uint256' },
        ],
        name: 'swapExactTokensForETH',
        outputs: [{ name: 'amounts', type: 'uint256[]' }],
        stateMutability: 'nonpayable',
        type: 'function',
      }],
      functionName: 'swapExactTokensForETH',
      args: [amountIn, amountOutMin, path, to, deadline],
    }),
  })
}

export function getUsdcAddress(): Address {
  return USDC_ADDRESS
}

export function getRouterAddress(): Address {
  return UNISWAP_V2_ROUTER
}

export function getWmonAddress(): Address {
  return WMON_ADDRESS
}

export function buildSwapPath(direction: SwapDirection): [Address, Address] {
  return direction === 'monToUsdc'
    ? [WMON_ADDRESS, USDC_ADDRESS]
    : [USDC_ADDRESS, WMON_ADDRESS]
}

export function calculateMinAmountOut(amountOut: bigint, slippagePercent: number): bigint {
  if (slippagePercent < 0 || slippagePercent > 100)
    throw new Error('Slippage must be between 0 and 100')
  return (amountOut * BigInt(100 - slippagePercent)) / 100n
}
