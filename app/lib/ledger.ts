import { createPublicClient, createWalletClient, formatEther, http, type PublicClient } from 'viem'
import { toViemAccount } from '@category-labs/mera/viem'
import type { Secp256k1SigningSession } from '@category-labs/mera'

import { chain } from './chain'

let publicClient: PublicClient | undefined

export function getPublicClient(): PublicClient {
  publicClient ??= createPublicClient({
    chain,
    transport: http(),
  })
  return publicClient
}

export async function readBalance(address: `0x${string}`): Promise<bigint> {
  return getPublicClient().getBalance({ address })
}

export function formatMon(value: bigint): string {
  return formatEther(value)
}

export async function sendPayment(
  session: Secp256k1SigningSession,
  to: `0x${string}`,
  value: bigint,
): Promise<`0x${string}`> {
  const account = toViemAccount(session)
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(),
  })
  return wallet.sendTransaction({ to, value })
}
