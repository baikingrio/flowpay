import { createWalletClient, http, type Address } from 'viem'
import { toViemAccount } from '@category-labs/mera/viem'
import type { Secp256k1SigningSession } from '@category-labs/mera'

import { chain } from './chain'
import { USDC_ADDRESS } from './tokens'
import { getPublicClient } from './ledger'

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
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

export async function readUsdcBalance(address: Address): Promise<bigint> {
  return getPublicClient().readContract({
    address: USDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
  })
}

export async function sendUsdcTransfer(
  session: Secp256k1SigningSession,
  to: Address,
  amountBase: bigint,
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
    functionName: 'transfer',
    args: [to, amountBase],
  })

  const client = getPublicClient()
  const receipt = await client.waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success')
    throw new Error('USDC transfer failed')

  return hash
}
