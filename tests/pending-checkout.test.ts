import { describe, expect, it } from 'vitest'
import { clearCheckoutIntent, readCheckoutIntent, stashCheckoutIntent } from '../app/lib/pending-checkout'

describe('pending checkout storage', () => {
  it('stashes and reads intent', () => {
    const mockStorage = new Map<string, string>()
    const storage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
    } as Storage

    const intent = {
      expectedTo: '0x0000000000000000000000000000000000000001' as const,
      amountBase: 123_456n,
      startedAt: 1000,
      token: '0x534b2f3A21130d7a60830c2Df862319e593943A3' as const,
    }

    stashCheckoutIntent(intent, storage)
    const read = readCheckoutIntent(storage)
    expect(read).toEqual(intent)
  })

  it('returns undefined when no intent stored', () => {
    const mockStorage = new Map<string, string>()
    const storage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
    } as Storage

    const read = readCheckoutIntent(storage)
    expect(read).toBeUndefined()
  })

  it('clears intent', () => {
    const mockStorage = new Map<string, string>()
    const storage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
    } as Storage

    const intent = {
      expectedTo: '0x0000000000000000000000000000000000000001' as const,
      amountBase: 123_456n,
      startedAt: 1000,
      token: '0x534b2f3A21130d7a60830c2Df862319e593943A3' as const,
    }

    stashCheckoutIntent(intent, storage)
    clearCheckoutIntent(storage)
    const read = readCheckoutIntent(storage)
    expect(read).toBeUndefined()
  })

  it('serializes bigint as string', () => {
    const mockStorage = new Map<string, string>()
    const storage = {
      getItem: (key: string) => mockStorage.get(key) ?? null,
      setItem: (key: string, value: string) => mockStorage.set(key, value),
      removeItem: (key: string) => mockStorage.delete(key),
    } as Storage

    const intent = {
      expectedTo: '0x0000000000000000000000000000000000000001' as const,
      amountBase: 999_999_999_999n,
      startedAt: 1000,
      token: '0x534b2f3A21130d7a60830c2Df862319e593943A3' as const,
    }

    stashCheckoutIntent(intent, storage)
    const stored = mockStorage.get('flowpay.checkoutIntent')
    expect(stored).toBeDefined()
    expect(stored).toContain('999999999999')
    expect(stored).not.toContain('999999999999n')
  })
})
