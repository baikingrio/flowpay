import { beforeEach, describe, expect, it } from 'vitest'

const store = new Map<string, string>()

function mockLocalStorage(): Storage {
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
    const storage = mockLocalStorage()
    const key = 'flowpay.credentialId'
    expect(storage.getItem(key)).toBeNull()
  })

  it('roundtrips credential id', () => {
    const storage = mockLocalStorage()
    const key = 'flowpay.credentialId'
    const credentialId = 'test-credential-id-123'

    storage.setItem(key, credentialId)
    expect(storage.getItem(key)).toBe(credentialId)

    storage.removeItem(key)
    expect(storage.getItem(key)).toBeNull()
  })

  it('clears credential id on sign out', () => {
    const storage = mockLocalStorage()
    const key = 'flowpay.credentialId'
    const credentialId = 'test-credential-id-456'

    storage.setItem(key, credentialId)
    expect(storage.getItem(key)).toBe(credentialId)

    storage.removeItem(key)
    expect(storage.getItem(key)).toBeNull()
  })
})
