/**
 * Checkout ledger: structured receipt storage for merchant USDC payments
 *
 * Settlement states:
 * - pending: Waiting for payment (not stored in ledger yet)
 * - success: Payment received and matched
 * - timeout: 5-minute window expired without match (not stored)
 * - mismatch: Future - received payment but amount/token doesn't match (not yet implemented)
 *
 * Storage: localStorage per-merchant; future: sync to backend
 * Export: CSV format for reconciliation
 */

export type SettlementStatus = 'success' | 'pending' | 'timeout' | 'mismatch'

export interface CheckoutReceipt {
  hash: `0x${string}`
  amountBase: bigint
  receivedAt: number
  to?: `0x${string}`
  status: SettlementStatus
  /**
   * Optional metadata for debugging or reconciliation
   */
  device?: string
  session?: string
}

interface CheckoutReceiptSerialized {
  hash: `0x${string}`
  amountBase: string
  receivedAt: number
  to?: `0x${string}`
  status: SettlementStatus
  device?: string
  session?: string
}

export interface TodaySummary {
  count: number
  totalBase: bigint
  items: CheckoutReceipt[]
}

const DEFAULT_CAP = 500

function storageKey(address: `0x${string}`): string {
  return `flowpay.checkoutLedger.${address.toLowerCase()}`
}

function defaultStorage(): Storage | undefined {
  if (!import.meta.client)
    return undefined
  return window.localStorage
}

export function isSameLocalDay(aMs: number, bMs?: number): boolean {
  const b = bMs ?? Date.now()
  const dateA = new Date(aMs)
  const dateB = new Date(b)
  return (
    dateA.getFullYear() === dateB.getFullYear()
    && dateA.getMonth() === dateB.getMonth()
    && dateA.getDate() === dateB.getDate()
  )
}

export function readCheckoutLedger(
  address: `0x${string}`,
  storage?: Storage,
): CheckoutReceipt[] {
  const s = storage ?? defaultStorage()
  if (!s)
    return []
  try {
    const raw = s.getItem(storageKey(address))
    if (!raw)
      return []
    const parsed = JSON.parse(raw) as CheckoutReceiptSerialized[]
    if (!Array.isArray(parsed))
      return []
    return parsed
      .filter(isValidSerializedReceipt)
      .map(deserializeReceipt)
  }
  catch {
    return []
  }
}

export function clearCheckoutLedger(
  address: `0x${string}`,
  storage?: Storage,
): void {
  const s = storage ?? defaultStorage()
  s?.removeItem(storageKey(address))
}

export function recordCheckoutReceipt(
  address: `0x${string}`,
  receipt: Omit<CheckoutReceipt, 'receivedAt'> & { receivedAt?: number },
  storage?: Storage,
  cap: number = DEFAULT_CAP,
): CheckoutReceipt[] {
  const next: CheckoutReceipt = {
    hash: receipt.hash,
    amountBase: receipt.amountBase,
    receivedAt: receipt.receivedAt ?? Date.now(),
    to: receipt.to,
    status: receipt.status ?? 'success', // Default to success for backward compat
    device: receipt.device,
    session: receipt.session,
  }

  const existing = readCheckoutLedger(address, storage)
  const filtered = existing.filter(item => item.hash !== next.hash)
  const updated = [next, ...filtered].slice(0, cap)

  const s = storage ?? defaultStorage()
  if (s) {
    const serialized = updated.map(serializeReceipt)
    s.setItem(storageKey(address), JSON.stringify(serialized))
  }

  return updated
}

export function summarizeToday(
  entries: CheckoutReceipt[],
  nowMs?: number,
): TodaySummary {
  const now = nowMs ?? Date.now()
  const todayItems = entries.filter(entry => isSameLocalDay(entry.receivedAt, now))

  return {
    count: todayItems.length,
    totalBase: todayItems.reduce((sum, item) => sum + item.amountBase, 0n),
    items: todayItems,
  }
}

function serializeReceipt(receipt: CheckoutReceipt): CheckoutReceiptSerialized {
  return {
    hash: receipt.hash,
    amountBase: receipt.amountBase.toString(),
    receivedAt: receipt.receivedAt,
    to: receipt.to,
    status: receipt.status,
    device: receipt.device,
    session: receipt.session,
  }
}

function deserializeReceipt(serialized: CheckoutReceiptSerialized): CheckoutReceipt {
  return {
    hash: serialized.hash,
    amountBase: BigInt(serialized.amountBase),
    receivedAt: serialized.receivedAt,
    to: serialized.to,
    status: serialized.status ?? 'success', // Backward compat
    device: serialized.device,
    session: serialized.session,
  }
}

function isValidSerializedReceipt(value: unknown): value is CheckoutReceiptSerialized {
  if (typeof value !== 'object' || value === null)
    return false
  const row = value as Partial<CheckoutReceiptSerialized>
  return (
    typeof row.hash === 'string'
    && row.hash.startsWith('0x')
    && typeof row.amountBase === 'string'
    && /^\d+$/.test(row.amountBase)
    && typeof row.receivedAt === 'number'
    && (row.to === undefined || (typeof row.to === 'string' && row.to.startsWith('0x')))
    && (row.status === undefined || ['success', 'pending', 'timeout', 'mismatch'].includes(row.status))
  )
}

/**
 * Export receipts as CSV for merchant reconciliation
 *
 * Columns: Timestamp, Amount (USDC), Status, Transaction Hash, Merchant Address
 */
export function exportReceiptsAsCSV(
  receipts: CheckoutReceipt[],
  options: { locale?: string } = {},
): string {
  const { locale = 'en-US' } = options

  // CSV header
  const header = 'Timestamp,Amount (USDC),Status,Transaction Hash,Merchant Address\n'

  // CSV rows
  const rows = receipts.map((receipt) => {
    const timestamp = new Date(receipt.receivedAt).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    // Convert from 6-decimal USDC base units to display amount
    const amountUsdc = (Number(receipt.amountBase) / 1_000_000).toFixed(6)
    const status = receipt.status
    const hash = receipt.hash
    const merchant = receipt.to ?? 'N/A'

    return `"${timestamp}","${amountUsdc}","${status}","${hash}","${merchant}"`
  })

  return header + rows.join('\n')
}

/**
 * Trigger CSV download in the browser
 */
export function downloadCSV(csv: string, filename: string = 'flowpay-ledger.csv'): void {
  if (!import.meta.client)
    return

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

