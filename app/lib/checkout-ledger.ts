export interface CheckoutReceipt {
  hash: `0x${string}`
  amountBase: bigint
  receivedAt: number
  to?: `0x${string}`
}

interface CheckoutReceiptSerialized {
  hash: `0x${string}`
  amountBase: string
  receivedAt: number
  to?: `0x${string}`
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
  }
}

function deserializeReceipt(serialized: CheckoutReceiptSerialized): CheckoutReceipt {
  return {
    hash: serialized.hash,
    amountBase: BigInt(serialized.amountBase),
    receivedAt: serialized.receivedAt,
    to: serialized.to,
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
  )
}
