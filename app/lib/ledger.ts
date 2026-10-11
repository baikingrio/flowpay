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

/** Transaction was mined but reverted. */
export class TxRevertedError extends Error {
  constructor(readonly hash: `0x${string}`) {
    super(`Transaction reverted: ${hash}`)
    this.name = 'TxRevertedError'
  }
}

/** Wait for the receipt; throws TxRevertedError if the tx reverted. */
export async function waitForSuccess(hash: `0x${string}`): Promise<`0x${string}`> {
  const receipt = await getPublicClient().waitForTransactionReceipt({ hash })
  if (receipt.status !== 'success')
    throw new TxRevertedError(hash)
  return hash
}

/** Native MON transfer: broadcast, report the hash, then wait until it is mined. */
export async function sendPayment(
  session: Secp256k1SigningSession,
  to: `0x${string}`,
  value: bigint,
  onBroadcast?: (hash: `0x${string}`) => void,
): Promise<`0x${string}`> {
  const account = toViemAccount(session)
  const wallet = createWalletClient({
    account,
    chain,
    transport: http(),
  })
  const hash = await wallet.sendTransaction({ to, value })
  onBroadcast?.(hash)
  return waitForSuccess(hash)
}
