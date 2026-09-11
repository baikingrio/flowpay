import { shortAddress } from './format'

export type ActivityPayment = {
  hash: `0x${string}`
  to: `0x${string}`
  valueWei: string
  at: number
}

const MAX_ENTRIES = 20

function storageKey(address: `0x${string}`): string {
  return `flowpay.activity.${address.toLowerCase()}`
}

export function readActivity(address: `0x${string}`): ActivityPayment[] {
  if (!import.meta.client)
    return []
  try {
    const raw = window.localStorage.getItem(storageKey(address))
    if (!raw)
      return []
    const parsed = JSON.parse(raw) as ActivityPayment[]
    if (!Array.isArray(parsed))
      return []
    return parsed.filter(isActivityPayment)
  }
  catch {
    return []
  }
}

export function recordPayment(
  address: `0x${string}`,
  entry: Omit<ActivityPayment, 'at'> & { at?: number },
): ActivityPayment[] {
  const next: ActivityPayment = {
    hash: entry.hash,
    to: entry.to,
    valueWei: entry.valueWei,
    at: entry.at ?? Date.now(),
  }
  const list = [next, ...readActivity(address).filter(item => item.hash !== next.hash)].slice(0, MAX_ENTRIES)
  if (import.meta.client)
    window.localStorage.setItem(storageKey(address), JSON.stringify(list))
  return list
}

export function shortTxHash(hash: string): string {
  return shortAddress(hash)
}

function isActivityPayment(value: unknown): value is ActivityPayment {
  if (typeof value !== 'object' || value === null)
    return false
  const row = value as Partial<ActivityPayment>
  return typeof row.hash === 'string'
    && row.hash.startsWith('0x')
    && typeof row.to === 'string'
    && row.to.startsWith('0x')
    && typeof row.valueWei === 'string'
    && typeof row.at === 'number'
}
