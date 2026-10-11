import type { ActivityPayment } from './activity'
import type { CheckoutReceipt } from './checkout-ledger'
import { receiptToken } from './checkout-ledger'

/** Wallet assets. `usdc` is the payment token (mUSDC on testnet). */
export type AssetId = 'mon' | 'usdc'

export interface AssetMeta {
  id: AssetId
  /** URL slug: /asset/mon, /asset/musdc */
  slug: string
  symbol: string
  name: string
  decimals: number
}

export function assetMeta(id: AssetId, isMockUsdc: boolean): AssetMeta {
  if (id === 'mon')
    return { id, slug: 'mon', symbol: 'MON', name: 'Monad', decimals: 18 }
  return isMockUsdc
    ? { id, slug: 'musdc', symbol: 'mUSDC', name: 'Mock USDC', decimals: 6 }
    : { id, slug: 'usdc', symbol: 'USDC', name: 'USD Coin', decimals: 6 }
}

/** Route slug or `?asset=` query → asset id (mon | usdc | musdc, any case). */
export function parseAssetParam(value: unknown): AssetId | undefined {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string')
    return undefined
  const v = raw.trim().toLowerCase()
  if (v === 'mon')
    return 'mon'
  if (v === 'usdc' || v === 'musdc')
    return 'usdc'
  return undefined
}

/**
 * Display amount: truncated (never rounded up) to `maxFraction` digits,
 * trailing zeros trimmed, thousands grouped. Dust shows as "<0.0001".
 */
export function formatTokenAmount(base: bigint, decimals: number, maxFraction = 4): string {
  const negative = base < 0n
  const abs = negative ? -base : base
  const scale = 10n ** BigInt(decimals)
  const whole = abs / scale
  const digits = Math.min(maxFraction, decimals)
  const fracFull = (abs % scale).toString().padStart(decimals, '0')
  const frac = fracFull.slice(0, digits).replace(/0+$/, '')
  if (whole === 0n && frac === '' && abs > 0n)
    return `${negative ? '-' : ''}<0.${'0'.repeat(Math.max(digits - 1, 0))}1`
  const grouped = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `${negative ? '-' : ''}${grouped}${frac ? `.${frac}` : ''}`
}

export interface AssetActivityItem {
  kind: 'sent' | 'received'
  amountBase: bigint
  at: number
  hash?: `0x${string}`
  /** Recipient for sent payments. */
  counterparty?: `0x${string}`
}

/** Sent payments (activity) + received checkout receipts for one asset, newest first. */
export function assetActivity(
  asset: AssetId,
  sent: ActivityPayment[],
  received: CheckoutReceipt[],
  limit = 30,
): AssetActivityItem[] {
  const wantToken = asset === 'mon' ? 'MON' : 'USDC'
  const out: AssetActivityItem[] = []
  for (const item of sent) {
    if ((item.token ?? 'MON') !== wantToken)
      continue
    let amountBase: bigint
    try {
      amountBase = BigInt(item.valueWei)
    }
    catch {
      continue
    }
    out.push({ kind: 'sent', amountBase, at: item.at, hash: item.hash, counterparty: item.to })
  }
  for (const receipt of received) {
    if (receipt.status !== 'success' || receiptToken(receipt) !== wantToken)
      continue
    out.push({ kind: 'received', amountBase: receipt.amountBase, at: receipt.receivedAt, hash: receipt.hash })
  }
  return out.sort((a, b) => b.at - a.at).slice(0, limit)
}
