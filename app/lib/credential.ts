const STORAGE_KEY = 'flowpay.credentialId'

export function readStoredCredentialId(): string | undefined {
  if (!import.meta.client)
    return undefined
  const value = window.localStorage.getItem(STORAGE_KEY)
  return value || undefined
}

export function writeStoredCredentialId(credentialId: string): void {
  if (!import.meta.client)
    return
  window.localStorage.setItem(STORAGE_KEY, credentialId)
}
