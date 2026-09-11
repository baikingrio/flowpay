import { beforeEach, describe, expect, it } from 'vitest'
import { clearStoredCredentialId, readStoredCredentialId, writeStoredCredentialId } from '../app/lib/credential'

const store = new Map<string, string>()

function storeAsStorage(): Storage {
  return {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v) },
    removeItem: (k) => { store.delete(k) },
    key: () => null,
  }
}

describe('credential storage', () => {
  beforeEach(() => {
    store.clear()
  })

  it('reads undefined when no credential is stored', () => {
    expect(readStoredCredentialId(storeAsStorage())).toBeUndefined()
  })

  it('roundtrips credential id', () => {
    const storage = storeAsStorage()
    const credentialId = 'test-credential-id-123'

    writeStoredCredentialId(credentialId, storage)
    expect(readStoredCredentialId(storage)).toBe(credentialId)

    clearStoredCredentialId(storage)
    expect(readStoredCredentialId(storage)).toBeUndefined()
  })

  it('clears credential id', () => {
    const storage = storeAsStorage()
    const credentialId = 'test-credential-id-456'

    writeStoredCredentialId(credentialId, storage)
    expect(readStoredCredentialId(storage)).toBe(credentialId)

    clearStoredCredentialId(storage)
    expect(readStoredCredentialId(storage)).toBeUndefined()
    expect(store.get('flowpay.credentialId')).toBeUndefined()
  })

  it('stores under correct key', () => {
    const storage = storeAsStorage()
    const credentialId = 'test-credential-789'
    writeStoredCredentialId(credentialId, storage)
    expect(store.get('flowpay.credentialId')).toBe(credentialId)
  })
})
