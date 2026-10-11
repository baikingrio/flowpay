import { shortAddress } from './format'

export type ActivityPayment = {
  hash: `0x${string}`
  to: `0x${string}`
  /** Amount in the token's base units (wei for MON, 6-decimal for USDC). */
  valueWei: string
  at: number
  /** Absent on entries stored before USDC sends were recorded → MON. */
  token?: 'MON' | 'USDC'
}

const MAX_ENTRIES = 20

function storageKey(address: `0x${string}`): string {
  return `flowpay.activity.${address.toLowerCase()}`
}

function defaultStorage(): Storage | undefined {
  if (!import.meta.client)
    return undefined
  return window.localStorage
}

export function readActivity(address: `0x${string}`, storage?: Storage): ActivityPayment[] {
  const s = storage ?? defaultStorage()
  if (!s)
    return []
  try {
    const raw = s.getItem(storageKey(address))
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
  storage?: Storage,
): ActivityPayment[] {
  const next: ActivityPayment = {
    hash: entry.hash,
    to: entry.to,
    valueWei: entry.valueWei,
    at: entry.at ?? Date.now(),
    ...(entry.token === 'USDC' ? { token: 'USDC' as const } : {}),
  }
  const list = [next, ...readActivity(address, storage).filter(item => item.hash !== next.hash)].slice(0, MAX_ENTRIES)
  const s = storage ?? defaultStorage()
  s?.setItem(storageKey(address), JSON.stringify(list))
  return list
}

export function clearActivity(address: `0x${string}`, storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.removeItem(storageKey(address))
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
    && (row.token === undefined || row.token === 'MON' || row.token === 'USDC')
}
