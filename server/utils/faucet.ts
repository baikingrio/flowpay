import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  type PrivateKeyAccount,
  type PublicClient,
  type WalletClient,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { monadTestnet } from 'viem/chains'

import { CooldownTracker, MONAD_TESTNET_RPCS, normalizePrivateKey, parseDripAmount } from '../../shared/faucet'

export interface FaucetRuntime {
  account: PrivateKeyAccount
  publicClient: PublicClient
  walletClient: WalletClient
  amount: bigint
}

let runtime: FaucetRuntime | null | undefined

function transport() {
  return fallback(MONAD_TESTNET_RPCS.map(url => http(url, { timeout: 8_000, retryCount: 1 })))
}

/** Lazily built from env. Returns null when FAUCET_PRIVATE_KEY is missing/malformed. Never logs the key. */
export function getFaucetRuntime(): FaucetRuntime | null {
  if (runtime !== undefined)
    return runtime
  const key = normalizePrivateKey(process.env.FAUCET_PRIVATE_KEY)
  if (!key) {
    runtime = null
    return runtime
  }
  let account: PrivateKeyAccount
  try {
    account = privateKeyToAccount(key)
  }
  catch {
    runtime = null
    return runtime
  }
  runtime = {
    account,
    publicClient: createPublicClient({ chain: monadTestnet, transport: transport() }) as PublicClient,
    walletClient: createWalletClient({ account, chain: monadTestnet, transport: transport() }),
    amount: parseDripAmount(process.env.FAUCET_MON_AMOUNT),
  }
  return runtime
}

/** Per-instance cooldown (best effort). */
export const faucetCooldown = new CooldownTracker()

let queue: Promise<unknown> = Promise.resolve()

/** Serialise check+send within one instance so concurrent drips don't race the nonce / balance check. */
export function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn)
  queue = next.catch(() => undefined)
  return next
}

/** Log without leaking request bodies / signed payloads. */
export function logFaucetError(stage: string, error: unknown): void {
  const e = error as { name?: string, shortMessage?: string }
  console.error(`[faucet] ${stage}: ${e?.name ?? 'Error'}${e?.shortMessage ? ` — ${e.shortMessage}` : ''}`)
}
