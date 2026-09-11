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

describe('activity storage', () => {
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`
  const storageKey = `flowpay.activity.${testAddress.toLowerCase()}`

  beforeEach(() => {
    store.clear()
  })

  it('reads empty array when no activity is stored', () => {
    const storage = mockLocalStorage()
    expect(storage.getItem(storageKey)).toBeNull()
  })

  it('stores and retrieves activity', () => {
    const storage = mockLocalStorage()
    const activity = [
      {
        hash: '0xabc123' as `0x${string}`,
        to: '0x9876543210fedcba9876543210fedcba98765432' as `0x${string}`,
        valueWei: '1000000000000000000',
        at: Date.now(),
      },
    ]

    storage.setItem(storageKey, JSON.stringify(activity))
    const retrieved = JSON.parse(storage.getItem(storageKey)!)
    expect(retrieved).toEqual(activity)
  })

  it('clears activity on sign out', () => {
    const storage = mockLocalStorage()
    const activity = [
      {
        hash: '0xdef456' as `0x${string}`,
        to: '0x1111222233334444555566667777888899990000' as `0x${string}`,
        valueWei: '2000000000000000000',
        at: Date.now(),
      },
    ]

    storage.setItem(storageKey, JSON.stringify(activity))
    expect(storage.getItem(storageKey)).not.toBeNull()

    storage.removeItem(storageKey)
    expect(storage.getItem(storageKey)).toBeNull()
  })

  it('activity is address-specific', () => {
    const storage = mockLocalStorage()
    const address1 = '0x1111111111111111111111111111111111111111' as `0x${string}`
    const address2 = '0x2222222222222222222222222222222222222222' as `0x${string}`
    const key1 = `flowpay.activity.${address1.toLowerCase()}`
    const key2 = `flowpay.activity.${address2.toLowerCase()}`

    const activity1 = [{ hash: '0xa1' as `0x${string}`, to: address2, valueWei: '1', at: 1 }]
    const activity2 = [{ hash: '0xa2' as `0x${string}`, to: address1, valueWei: '2', at: 2 }]

    storage.setItem(key1, JSON.stringify(activity1))
    storage.setItem(key2, JSON.stringify(activity2))

    expect(JSON.parse(storage.getItem(key1)!)).toEqual(activity1)
    expect(JSON.parse(storage.getItem(key2)!)).toEqual(activity2)

    storage.removeItem(key1)
    expect(storage.getItem(key1)).toBeNull()
    expect(JSON.parse(storage.getItem(key2)!)).toEqual(activity2)
  })
})
