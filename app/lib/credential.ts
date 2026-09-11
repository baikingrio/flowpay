const STORAGE_KEY = 'flowpay.credentialId'

function defaultStorage(): Storage | undefined {
  if (!import.meta.client)
    return undefined
  return window.localStorage
}

export function readStoredCredentialId(storage?: Storage): string | undefined {
  const s = storage ?? defaultStorage()
  const value = s?.getItem(STORAGE_KEY)
  return value || undefined
}

export function writeStoredCredentialId(credentialId: string, storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.setItem(STORAGE_KEY, credentialId)
}

export function clearStoredCredentialId(storage?: Storage): void {
  const s = storage ?? defaultStorage()
  s?.removeItem(STORAGE_KEY)
}
