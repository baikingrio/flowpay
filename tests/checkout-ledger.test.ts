import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CheckoutReceipt } from '../app/lib/checkout-ledger'
import {
  clearCheckoutLedger,
  isSameLocalDay,
  readCheckoutLedger,
  recordCheckoutReceipt,
  summarizeToday,
} from '../app/lib/checkout-ledger'

describe('isSameLocalDay', () => {
  it('returns true for same day timestamps', () => {
    const a = new Date('2026-09-11T10:00:00').getTime()
    const b = new Date('2026-09-11T23:59:00').getTime()
    expect(isSameLocalDay(a, b)).toBe(true)
  })

  it('returns false for different days', () => {
    const a = new Date('2026-09-11T23:59:00').getTime()
    const b = new Date('2026-09-12T00:01:00').getTime()
    expect(isSameLocalDay(a, b)).toBe(false)
  })

  it('uses current time when second arg omitted', () => {
    const now = Date.now()
    expect(isSameLocalDay(now)).toBe(true)
  })
})

describe('storage helpers', () => {
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`
  let storage: Map<string, string>

  beforeEach(() => {
    storage = new Map()
  })

  afterEach(() => {
    storage.clear()
  })

  const mockStorage: Storage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
    removeItem: (key: string) => { storage.delete(key) },
    clear: () => { storage.clear() },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() { return storage.size },
  }

  it('reads empty array when no data', () => {
    const entries = readCheckoutLedger(testAddress, mockStorage)
    expect(entries).toEqual([])
  })

  it('records and reads back', () => {
    const receipt: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xabc',
      amountBase: 10_000_000n,
      to: testAddress,
    }
    const entries = recordCheckoutReceipt(testAddress, receipt, mockStorage)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      hash: receipt.hash,
      amountBase: receipt.amountBase,
      to: receipt.to,
    })
    expect(entries[0]?.receivedAt).toBeTypeOf('number')

    const readBack = readCheckoutLedger(testAddress, mockStorage)
    expect(readBack).toHaveLength(1)
    expect(readBack[0]).toEqual(entries[0])
  })

  it('deduplicates by hash', () => {
    const receipt: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xabc',
      amountBase: 10_000_000n,
      to: testAddress,
    }
    recordCheckoutReceipt(testAddress, receipt, mockStorage)
    const entries = recordCheckoutReceipt(testAddress, receipt, mockStorage)
    expect(entries).toHaveLength(1)
  })

  it('prepends new entries (newest first)', () => {
    const receipt1: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xaaa',
      amountBase: 5_000_000n,
    }
    const receipt2: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xbbb',
      amountBase: 10_000_000n,
    }
    recordCheckoutReceipt(testAddress, receipt1, mockStorage)
    const entries = recordCheckoutReceipt(testAddress, receipt2, mockStorage)

    expect(entries).toHaveLength(2)
    expect(entries[0]?.hash).toBe('0xbbb')
    expect(entries[1]?.hash).toBe('0xaaa')
  })

  it('trims to cap (default 500)', () => {
    for (let i = 0; i < 510; i++) {
      recordCheckoutReceipt(
        testAddress,
        { hash: `0x${i.toString(16).padStart(3, '0')}`, amountBase: 1_000_000n },
        mockStorage,
      )
    }
    const entries = readCheckoutLedger(testAddress, mockStorage)
    expect(entries).toHaveLength(500)
    expect(entries[0]?.hash).toBe('0x1fd')
  })

  it('respects custom cap', () => {
    for (let i = 0; i < 5; i++) {
      recordCheckoutReceipt(
        testAddress,
        { hash: `0x${i.toString(16)}`, amountBase: 1_000_000n },
        mockStorage,
        3,
      )
    }
    const entries = readCheckoutLedger(testAddress, mockStorage)
    expect(entries).toHaveLength(3)
    expect(entries[0]?.hash).toBe('0x4')
  })

  it('clears ledger', () => {
    recordCheckoutReceipt(testAddress, { hash: '0xabc', amountBase: 10_000_000n }, mockStorage)
    clearCheckoutLedger(testAddress, mockStorage)
    const entries = readCheckoutLedger(testAddress, mockStorage)
    expect(entries).toEqual([])
  })

  it('serializes bigint as decimal string in JSON', () => {
    const receipt: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xabc',
      amountBase: 12_500_000n,
    }
    recordCheckoutReceipt(testAddress, receipt, mockStorage)
    const raw = storage.get(`flowpay.checkoutLedger.${testAddress.toLowerCase()}`)
    expect(raw).toBeDefined()
    expect(raw).toContain('"amountBase":"12500000"')
    expect(raw).not.toContain('12500000n')
  })
})

describe('summarizeToday', () => {
  const now = new Date('2026-09-11T15:00:00').getTime()

  it('returns empty summary when no entries', () => {
    const summary = summarizeToday([], now)
    expect(summary).toEqual({
      count: 0,
      totalBase: 0n,
      items: [],
    })
  })

  it('filters by same local day', () => {
    const today1 = new Date('2026-09-11T09:00:00').getTime()
    const today2 = new Date('2026-09-11T20:00:00').getTime()
    const yesterday = new Date('2026-09-10T23:00:00').getTime()

    const entries: CheckoutReceipt[] = [
      { hash: '0xa', amountBase: 5_000_000n, receivedAt: today1 },
      { hash: '0xb', amountBase: 10_000_000n, receivedAt: today2 },
      { hash: '0xc', amountBase: 3_000_000n, receivedAt: yesterday },
    ]

    const summary = summarizeToday(entries, now)
    expect(summary.count).toBe(2)
    expect(summary.totalBase).toBe(15_000_000n)
    expect(summary.items).toHaveLength(2)
    expect(summary.items[0]?.hash).toBe('0xa')
    expect(summary.items[1]?.hash).toBe('0xb')
  })

  it('calculates total correctly', () => {
    const t1 = new Date('2026-09-11T10:00:00').getTime()
    const t2 = new Date('2026-09-11T12:00:00').getTime()
    const t3 = new Date('2026-09-11T14:00:00').getTime()

    const entries: CheckoutReceipt[] = [
      { hash: '0xa', amountBase: 1_000_000n, receivedAt: t1 },
      { hash: '0xb', amountBase: 2_500_000n, receivedAt: t2 },
      { hash: '0xc', amountBase: 500_000n, receivedAt: t3 },
    ]

    const summary = summarizeToday(entries, now)
    expect(summary.totalBase).toBe(4_000_000n)
  })

  it('uses current time when nowMs omitted', () => {
    const now = Date.now()
    const entries: CheckoutReceipt[] = [
      { hash: '0xa', amountBase: 5_000_000n, receivedAt: now },
    ]
    const summary = summarizeToday(entries)
    expect(summary.count).toBe(1)
  })
})
