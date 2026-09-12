const STORAGE_KEY = 'flowpay.boundAddress'

function defaultStorage(): Storage | undefined {
  if (!import.meta.client)
    return undefined
  return window.localStorage
}

function isValidAddress(value: unknown): value is `0x${string}` {
  if (typeof value !== 'string')
    return false
  return /^0x[0-9a-fA-F]{40}$/.test(value)
}

export function readBoundAddress(storage?: Storage): `0x${string}` | undefined {
  const s = storage ?? defaultStorage()
  const value = s?.getItem(STORAGE_KEY)
  if (!value)
    return undefined
  return isValidAddress(value) ? value : undefined
}

export function writeBoundAddress(address: `0x${string}`, storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.setItem(STORAGE_KEY, address)
}

export function clearBoundAddress(storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.removeItem(STORAGE_KEY)
}
