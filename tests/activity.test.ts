import { beforeEach, describe, expect, it } from 'vitest'
import { clearActivity, readActivity, recordPayment } from '../app/lib/activity'

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

describe('activity storage', () => {
  const testAddress = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`
  const storageKey = `flowpay.activity.${testAddress.toLowerCase()}`

  beforeEach(() => {
    store.clear()
  })

  it('reads empty array when no activity is stored', () => {
    const activity = readActivity(testAddress, storeAsStorage())
    expect(activity).toEqual([])
  })

  it('records and retrieves activity', () => {
    const storage = storeAsStorage()
    const payment = {
      hash: '0xabc123' as `0x${string}`,
      to: '0x9876543210fedcba9876543210fedcba98765432' as `0x${string}`,
      valueWei: '1000000000000000000',
    }

    const result = recordPayment(testAddress, payment, storage)
    expect(result.length).toBe(1)
    expect(result[0].hash).toBe(payment.hash)
    expect(result[0].to).toBe(payment.to)
    expect(result[0].valueWei).toBe(payment.valueWei)

    const retrieved = readActivity(testAddress, storage)
    expect(retrieved).toEqual(result)
  })

  it('clears activity', () => {
    const storage = storeAsStorage()
    const payment = {
      hash: '0xdef456' as `0x${string}`,
      to: '0x1111222233334444555566667777888899990000' as `0x${string}`,
      valueWei: '2000000000000000000',
    }

    recordPayment(testAddress, payment, storage)
    expect(readActivity(testAddress, storage).length).toBe(1)

    clearActivity(testAddress, storage)
    expect(readActivity(testAddress, storage)).toEqual([])
    expect(store.get(storageKey)).toBeUndefined()
  })

  it('activity is address-specific', () => {
    const storage = storeAsStorage()
    const address1 = '0x1111111111111111111111111111111111111111' as `0x${string}`
    const address2 = '0x2222222222222222222222222222222222222222' as `0x${string}`

    const payment1 = {
      hash: '0xa1' as `0x${string}`,
      to: address2,
      valueWei: '1',
    }
    const payment2 = {
      hash: '0xa2' as `0x${string}`,
      to: address1,
      valueWei: '2',
    }

    recordPayment(address1, payment1, storage)
    recordPayment(address2, payment2, storage)

    const activity1 = readActivity(address1, storage)
    const activity2 = readActivity(address2, storage)

    expect(activity1.length).toBe(1)
    expect(activity1[0].hash).toBe(payment1.hash)
    expect(activity2.length).toBe(1)
    expect(activity2[0].hash).toBe(payment2.hash)

    clearActivity(address1, storage)
    expect(readActivity(address1, storage)).toEqual([])
    expect(readActivity(address2, storage).length).toBe(1)
  })

  it('deduplicates by hash', () => {
    const storage = storeAsStorage()
    const payment = {
      hash: '0xsame' as `0x${string}`,
      to: '0x1111111111111111111111111111111111111111' as `0x${string}`,
      valueWei: '100',
    }

    recordPayment(testAddress, payment, storage)
    recordPayment(testAddress, payment, storage)

    const activity = readActivity(testAddress, storage)
    expect(activity.length).toBe(1)
  })

  it('caps at MAX_ENTRIES', () => {
    const storage = storeAsStorage()
    for (let i = 0; i < 25; i++) {
      recordPayment(testAddress, {
        hash: `0x${i.toString(16).padStart(6, '0')}` as `0x${string}`,
        to: '0x1111111111111111111111111111111111111111' as `0x${string}`,
        valueWei: i.toString(),
      }, storage)
    }

    const activity = readActivity(testAddress, storage)
    expect(activity.length).toBe(20)
  })
})
