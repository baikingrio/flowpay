import { createPublicClient, createWalletClient, encodeAbiParameters, encodeFunctionData, http, parseAbiParameters, type Address } from 'viem'
import { toViemAccount } from '@category-labs/mera/viem'
import type { Secp256k1SigningSession } from '@category-labs/mera'

import { chain } from './chain'

/**
 * Uniswap V2 Router02 on Monad Testnet.
 * Official deployment: https://developers.uniswap.org/docs/protocols/v2/deployments
 */
const UNISWAP_V2_ROUTER = '0x4b2ab38dbf28d31d467aa8993f6c2585981d6804' as const

/**
 * USDC test token on Monad Testnet.
 * Pool MON/USDC: 0x659bD0BC4167BA25c62E05656F78043E7eD4a9da
 * Source: https://app.uniswap.org/explore/tokens/monad/0x754704Bc059F8C67012fEd69BC8A327a5aafb603
 */
const USDC_ADDRESS = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603' as const

/**
 * Wrapped MON (WMON) on Monad Testnet.
 * Official address: https://docs.monad.xyz/developer-essentials/testnet
 */
const WMON_ADDRESS = '0xFb8bf4c1CC7a94c73D209a149eA2AbEa852BC541' as const

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
): Promise<bigint> {
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
    return lastAmount ?? 0n
  }
  catch {
    return 0n
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
