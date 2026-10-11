/**
 * MON drip faucet policy — pure, no I/O. Shared by the Nitro route (server/api/faucet)
 * and the client (error codes / copy). Keep secrets out of this file.
 */
import { formatEther, getAddress, isAddress, parseEther, zeroAddress } from 'viem'

export const FAUCET_ERROR_CODES = [
  'invalid_address',
  'has_balance',
  'cooldown',
  'faucet_empty',
  'faucet_unconfigured',
  'send_failed',
] as const

export type FaucetErrorCode = (typeof FAUCET_ERROR_CODES)[number]

export function isFaucetErrorCode(value: unknown): value is FaucetErrorCode {
  return typeof value === 'string' && (FAUCET_ERROR_CODES as readonly string[]).includes(value)
}

/** HTTP status for each error code. */
export const FAUCET_HTTP_STATUS: Record<FaucetErrorCode, number> = {
  invalid_address: 400,
  has_balance: 409,
  cooldown: 429,
  faucet_empty: 503,
  faucet_unconfigured: 503,
  send_failed: 502,
}

/** Default drip: 0.05 MON. */
export const DEFAULT_DRIP_WEI = parseEther('0.05')
/** Hard cap for the env override, so a typo can't drain the wallet in one go. */
export const MAX_DRIP_WEI = parseEther('1')
/** Recipient must hold less than this to be eligible (main rate limiter, on-chain). */
export const RECIPIENT_MAX_BALANCE_WEI = parseEther('0.02')
/** Kept in the faucet on top of the drip to pay the transfer gas. */
export const GAS_BUFFER_WEI = parseEther('0.01')
/** Best-effort, per server instance. */
export const COOLDOWN_MS = 10 * 60 * 1000
/** How long the route waits for a receipt before answering `pending`. */
export const RECEIPT_TIMEOUT_MS = 20_000

/** Monad testnet RPCs, in fallback order (ankr currently returns empty responses, so it is left out). */
export const MONAD_TESTNET_RPCS = [
  'https://monad-testnet.drpc.org',
  'https://testnet-rpc.monad.xyz',
  'https://monad-testnet.gateway.tenderly.co',
] as const

/** Parse FAUCET_MON_AMOUNT (decimal MON). Falls back to the default when missing/invalid/out of range. */
export function parseDripAmount(raw: string | undefined): bigint {
  const value = raw?.trim()
  if (!value || !/^\d+(?:\.\d{1,18})?$/.test(value))
    return DEFAULT_DRIP_WEI
  try {
    const wei = parseEther(value)
    if (wei <= 0n || wei > MAX_DRIP_WEI)
      return DEFAULT_DRIP_WEI
    return wei
  }
  catch {
    return DEFAULT_DRIP_WEI
  }
}

/** Normalise a 32-byte hex private key (with or without 0x). Returns undefined when malformed. */
export function normalizePrivateKey(raw: string | undefined): `0x${string}` | undefined {
  const value = raw?.trim()
  if (!value)
    return undefined
  const hex = value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value
  if (!/^[0-9a-fA-F]{64}$/.test(hex))
    return undefined
  return `0x${hex}`
}

export type RecipientCheck =
  | { ok: true, address: `0x${string}` }
  | { ok: false, error: 'invalid_address' }

/** Valid checksum-or-lowercase address, not the zero address, not the faucet itself. */
export function validateRecipient(input: unknown, faucetAddress?: string): RecipientCheck {
  if (typeof input !== 'string')
    return { ok: false, error: 'invalid_address' }
  const value = input.trim()
  if (!isAddress(value, { strict: false }))
    return { ok: false, error: 'invalid_address' }
  const address = getAddress(value)
  if (address === zeroAddress)
    return { ok: false, error: 'invalid_address' }
  if (faucetAddress && address.toLowerCase() === faucetAddress.toLowerCase())
    return { ok: false, error: 'invalid_address' }
  return { ok: true, address }
}

/** Faucet has enough for one drip plus gas. */
export function hasFunds(faucetBalance: bigint, amount: bigint, gasBuffer = GAS_BUFFER_WEI): boolean {
  return faucetBalance >= amount + gasBuffer
}

/** On-chain policy. Returns the refusal code, or null when the drip may go out. */
export function decideDrip(input: {
  recipientBalance: bigint
  faucetBalance: bigint
  amount: bigint
  recipientMax?: bigint
  gasBuffer?: bigint
}): 'has_balance' | 'faucet_empty' | null {
  if (input.recipientBalance >= (input.recipientMax ?? RECIPIENT_MAX_BALANCE_WEI))
    return 'has_balance'
  if (!hasFunds(input.faucetBalance, input.amount, input.gasBuffer))
    return 'faucet_empty'
  return null
}

/** "0.05" style amount for JSON / UI. */
export function formatDrip(wei: bigint): string {
  return formatEther(wei)
}

/**
 * In-memory cooldown keyed by IP / address. Per server instance only — the on-chain
 * balance check in `decideDrip` is the real limiter.
 */
export class CooldownTracker {
  private readonly until = new Map<string, number>()

  constructor(private readonly windowMs = COOLDOWN_MS, private readonly maxEntries = 10_000) {}

  /** True when none of the keys is cooling down. */
  isFree(keys: readonly string[], now: number): boolean {
    return keys.every(key => (this.until.get(key) ?? 0) <= now)
  }

  mark(keys: readonly string[], now: number): void {
    this.prune(now)
    for (const key of keys)
      this.until.set(key, now + this.windowMs)
  }

  release(keys: readonly string[]): void {
    for (const key of keys)
      this.until.delete(key)
  }

  get size(): number {
    return this.until.size
  }

  private prune(now: number): void {
    if (this.until.size < this.maxEntries)
      return
    for (const [key, until] of this.until) {
      if (until <= now)
        this.until.delete(key)
    }
    // Still full (flood of distinct keys): drop oldest inserted.
    while (this.until.size >= this.maxEntries) {
      const first = this.until.keys().next().value
      if (first === undefined)
        break
      this.until.delete(first)
    }
  }
}

/** Cooldown keys for a request. Unknown IP → address key only. */
export function cooldownKeys(address: string, ip: string | undefined): string[] {
  const keys = [`addr:${address.toLowerCase()}`]
  if (ip)
    keys.push(`ip:${ip}`)
  return keys
}
