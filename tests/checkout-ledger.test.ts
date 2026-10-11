import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { CheckoutReceipt } from '../app/lib/checkout-ledger'
import {
  clearCheckoutLedger,
  exportReceiptsAsCSV,
  formatReceiptAmount,
  isSameLocalDay,
  readCheckoutLedger,
  receiptToken,
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
      status: 'success',
    }
    const entries = recordCheckoutReceipt(testAddress, receipt, mockStorage)
    expect(entries).toHaveLength(1)
    expect(entries[0]).toMatchObject({
      hash: receipt.hash,
      amountBase: receipt.amountBase,
      to: receipt.to,
      status: 'success',
    })
    expect(entries[0]?.receivedAt).toBeTypeOf('number')

    const readBack = readCheckoutLedger(testAddress, mockStorage)
    expect(readBack).toHaveLength(1)
    expect(readBack[0]).toEqual(entries[0])
  })

  it('defaults to success status for backward compatibility', () => {
    const receipt: Omit<CheckoutReceipt, 'receivedAt' | 'status'> = {
      hash: '0xabc',
      amountBase: 10_000_000n,
      to: testAddress,
    }
    const entries = recordCheckoutReceipt(testAddress, receipt as any, mockStorage)
    expect(entries[0]?.status).toBe('success')
  })

  it('deduplicates by hash', () => {
    const receipt: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xabc',
      amountBase: 10_000_000n,
      to: testAddress,
      status: 'success',
    }
    recordCheckoutReceipt(testAddress, receipt, mockStorage)
    const entries = recordCheckoutReceipt(testAddress, receipt, mockStorage)
    expect(entries).toHaveLength(1)
  })

  it('prepends new entries (newest first)', () => {
    const receipt1: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xaaa',
      amountBase: 5_000_000n,
      status: 'success',
    }
    const receipt2: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xbbb',
      amountBase: 10_000_000n,
      status: 'success',
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
        { hash: `0x${i.toString(16).padStart(3, '0')}`, amountBase: 1_000_000n, status: 'success' },
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
        { hash: `0x${i.toString(16)}`, amountBase: 1_000_000n, status: 'success' },
        mockStorage,
        3,
      )
    }
    const entries = readCheckoutLedger(testAddress, mockStorage)
    expect(entries).toHaveLength(3)
    expect(entries[0]?.hash).toBe('0x4')
  })

  it('clears ledger', () => {
    recordCheckoutReceipt(testAddress, { hash: '0xabc', amountBase: 10_000_000n, status: 'success' }, mockStorage)
    clearCheckoutLedger(testAddress, mockStorage)
    const entries = readCheckoutLedger(testAddress, mockStorage)
    expect(entries).toEqual([])
  })

  it('serializes bigint as decimal string in JSON', () => {
    const receipt: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xabc',
      amountBase: 12_500_000n,
      status: 'success',
    }
    recordCheckoutReceipt(testAddress, receipt, mockStorage)
    const raw = storage.get(`flowpay.checkoutLedger.${testAddress.toLowerCase()}`)
    expect(raw).toBeDefined()
    expect(raw).toContain('"amountBase":"12500000"')
    expect(raw).not.toContain('12500000n')
  })

  it('stores settlement status', () => {
    const receipt: Omit<CheckoutReceipt, 'receivedAt'> = {
      hash: '0xabc',
      amountBase: 10_000_000n,
      status: 'mismatch',
    }
    const entries = recordCheckoutReceipt(testAddress, receipt, mockStorage)
    expect(entries[0]?.status).toBe('mismatch')

    const readBack = readCheckoutLedger(testAddress, mockStorage)
    expect(readBack[0]?.status).toBe('mismatch')
  })
})

describe('summarizeToday', () => {
  const now = new Date('2026-09-11T15:00:00').getTime()

  it('returns empty summary when no entries', () => {
    const summary = summarizeToday([], now)
    expect(summary).toEqual({
      count: 0,
      totalBase: 0n,
      totalMonWei: 0n,
      items: [],
    })
  })

  it('filters by same local day', () => {
    const today1 = new Date('2026-09-11T09:00:00').getTime()
    const today2 = new Date('2026-09-11T20:00:00').getTime()
    const yesterday = new Date('2026-09-10T23:00:00').getTime()

    const entries: CheckoutReceipt[] = [
      { hash: '0xa', amountBase: 5_000_000n, receivedAt: today1, status: 'success' },
      { hash: '0xb', amountBase: 10_000_000n, receivedAt: today2, status: 'success' },
      { hash: '0xc', amountBase: 3_000_000n, receivedAt: yesterday, status: 'success' },
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
      { hash: '0xa', amountBase: 1_000_000n, receivedAt: t1, status: 'success' },
      { hash: '0xb', amountBase: 2_500_000n, receivedAt: t2, status: 'success' },
      { hash: '0xc', amountBase: 500_000n, receivedAt: t3, status: 'success' },
    ]

    const summary = summarizeToday(entries, now)
    expect(summary.totalBase).toBe(4_000_000n)
  })

  it('uses current time when nowMs omitted', () => {
    const now = Date.now()
    const entries: CheckoutReceipt[] = [
      { hash: '0xa', amountBase: 5_000_000n, receivedAt: now, status: 'success' },
    ]
    const summary = summarizeToday(entries)
    expect(summary.count).toBe(1)
  })
})

describe('exportReceiptsAsCSV', () => {
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`

  it('exports empty CSV with header', () => {
    const csv = exportReceiptsAsCSV([])
    expect(csv).toContain('Timestamp,Token,Amount,Status,Transaction Hash,Merchant Address')
    const lines = csv.split('\n').filter(line => line.trim() !== '')
    expect(lines).toHaveLength(1) // Only header, no data rows
  })

  it('exports receipts with correct columns', () => {
    const receipts: CheckoutReceipt[] = [
      {
        hash: '0xabc123',
        amountBase: 10_000_000n, // 10 USDC
        receivedAt: new Date('2026-09-11T15:30:00').getTime(),
        to: testAddress,
        status: 'success',
      },
      {
        hash: '0xdef456',
        amountBase: 5_500_000n, // 5.5 USDC
        receivedAt: new Date('2026-09-11T16:45:00').getTime(),
        to: testAddress,
        status: 'success',
      },
    ]

    const csv = exportReceiptsAsCSV(receipts, { locale: 'en-US' })
    const lines = csv.split('\n')

    expect(lines).toHaveLength(3) // Header + 2 rows
    expect(lines[0]).toContain('Timestamp,Token,Amount,Status,Transaction Hash,Merchant Address')
    expect(lines[1]).toContain('10.000000')
    expect(lines[1]).toContain('success')
    expect(lines[1]).toContain('0xabc123')
    expect(lines[2]).toContain('5.500000')
    expect(lines[2]).toContain('0xdef456')
  })

  it('formats amounts with 6 decimals', () => {
    const receipts: CheckoutReceipt[] = [
      {
        hash: '0xabc',
        amountBase: 1_234_567n, // 1.234567 USDC
        receivedAt: Date.now(),
        status: 'success',
      },
    ]

    const csv = exportReceiptsAsCSV(receipts)
    expect(csv).toContain('1.234567')
  })

  it('includes settlement status', () => {
    const receipts: CheckoutReceipt[] = [
      {
        hash: '0xabc',
        amountBase: 10_000_000n,
        receivedAt: Date.now(),
        status: 'mismatch',
      },
    ]

    const csv = exportReceiptsAsCSV(receipts)
    expect(csv).toContain('mismatch')
  })

  it('handles missing merchant address', () => {
    const receipts: CheckoutReceipt[] = [
      {
        hash: '0xabc',
        amountBase: 10_000_000n,
        receivedAt: Date.now(),
        status: 'success',
      },
    ]

    const csv = exportReceiptsAsCSV(receipts)
    expect(csv).toContain('N/A')
  })
})

describe('token field (USDC + MON)', () => {
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb' as `0x${string}`
  let storage: Map<string, string>
  const mockStorage: Storage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value) },
    removeItem: (key: string) => { storage.delete(key) },
    clear: () => { storage.clear() },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() { return storage.size },
  }

  beforeEach(() => {
    storage = new Map()
  })

  it('treats legacy entries without token as USDC', () => {
    storage.set(
      `flowpay.checkoutLedger.${testAddress.toLowerCase()}`,
      JSON.stringify([{ hash: '0xabc', amountBase: '1000000', receivedAt: 1, status: 'success' }]),
    )
    const entries = readCheckoutLedger(testAddress, mockStorage)
    expect(entries).toHaveLength(1)
    expect(entries[0]?.token).toBe('USDC')
    expect(receiptToken(entries[0]!)).toBe('USDC')
  })

  it('records MON receipts without a hash and never dedupes them', () => {
    recordCheckoutReceipt(testAddress, { token: 'MON', amountBase: 10n ** 17n, status: 'success' }, mockStorage)
    const entries = recordCheckoutReceipt(testAddress, { token: 'MON', amountBase: 10n ** 17n, status: 'success' }, mockStorage)
    expect(entries).toHaveLength(2)
    const readBack = readCheckoutLedger(testAddress, mockStorage)
    expect(readBack).toHaveLength(2)
    expect(readBack[0]?.token).toBe('MON')
    expect(readBack[0]?.hash).toBeUndefined()
  })

  it('summarizes per-token totals', () => {
    const now = new Date('2026-09-11T15:00:00').getTime()
    const at = new Date('2026-09-11T10:00:00').getTime()
    const summary = summarizeToday([
      { hash: '0xa', amountBase: 2_000_000n, receivedAt: at, status: 'success' },
      { hash: '0xb', token: 'USDC', amountBase: 500_000n, receivedAt: at, status: 'success' },
      { token: 'MON', amountBase: 3n * 10n ** 17n, receivedAt: at, status: 'success' },
    ], now)
    expect(summary.count).toBe(3)
    expect(summary.totalBase).toBe(2_500_000n)
    expect(summary.totalMonWei).toBe(3n * 10n ** 17n)
  })

  it('exports token column and exact MON amount', () => {
    const csv = exportReceiptsAsCSV([
      { token: 'MON', amountBase: 1_500_000_000_000_000_001n, receivedAt: Date.now(), status: 'success', to: testAddress },
      { hash: '0xdef', amountBase: 2_000_000n, receivedAt: Date.now(), status: 'success' },
    ])
    const lines = csv.split('\n')
    expect(lines[1]).toContain('"MON","1.500000000000000001","success","",')
    expect(lines[2]).toContain('"USDC","2.000000","success","0xdef"')
  })

  it('formats receipt amounts exactly', () => {
    expect(formatReceiptAmount({ amountBase: 1_234_567n })).toBe('1.234567')
    expect(formatReceiptAmount({ token: 'MON', amountBase: 10n ** 18n })).toBe('1')
  })
})
