export const PENDING_PAY_URI_KEY = 'flowpay.pendingPayUri'

export function stashPendingPayUri(uri: string, storage?: Storage): void {
  const s = storage ?? defaultStorage()
  if (!s)
    return
  s.setItem(PENDING_PAY_URI_KEY, uri)
}

export function readPendingPayUri(storage?: Storage): string | undefined {
  const s = storage ?? defaultStorage()
  const v = s?.getItem(PENDING_PAY_URI_KEY)
  return v || undefined
}

export function clearPendingPayUri(storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.removeItem(PENDING_PAY_URI_KEY)
}

function defaultStorage(): Storage | undefined {
  if (typeof window === 'undefined')
    return undefined
  return window.sessionStorage
}
