import { describe, expect, it } from 'vitest'
import type { ActivityPayment } from '../app/lib/activity'
import { assetActivity, assetMeta, formatTokenAmount, parseAssetParam } from '../app/lib/assets'
import type { CheckoutReceipt } from '../app/lib/checkout-ledger'

describe('parseAssetParam', () => {
  it('maps slugs and query values', () => {
    expect(parseAssetParam('mon')).toBe('mon')
    expect(parseAssetParam('MON')).toBe('mon')
    expect(parseAssetParam('musdc')).toBe('usdc')
    expect(parseAssetParam('usdc')).toBe('usdc')
    expect(parseAssetParam(['mon'])).toBe('mon')
    expect(parseAssetParam('eth')).toBeUndefined()
    expect(parseAssetParam(undefined)).toBeUndefined()
  })
})

describe('assetMeta', () => {
  it('uses the mUSDC slug on testnet', () => {
    expect(assetMeta('usdc', true).slug).toBe('musdc')
    expect(assetMeta('usdc', false).symbol).toBe('USDC')
    expect(assetMeta('mon', true)).toMatchObject({ slug: 'mon', decimals: 18 })
  })
})

describe('formatTokenAmount', () => {
  it('truncates, trims and groups', () => {
    expect(formatTokenAmount(1_234_567_890n, 6)).toBe('1,234.5678')
    expect(formatTokenAmount(100_000_000n, 6)).toBe('100')
    expect(formatTokenAmount(0n, 18)).toBe('0')
    expect(formatTokenAmount(19_999n * 10n ** 14n, 18)).toBe('1.9999')
    expect(formatTokenAmount(199_999n * 10n ** 13n, 18)).toBe('1.9999')
  })
  it('shows dust instead of 0', () => {
    expect(formatTokenAmount(1n, 18)).toBe('<0.0001')
    expect(formatTokenAmount(1n, 6, 6)).toBe('0.000001')
  })
})

describe('assetActivity', () => {
  const to = '0x00000000000000000000000000000000000000aa' as const
  const sent: ActivityPayment[] = [
    { hash: '0x01', to, valueWei: '1000000000000000000', at: 100 },
    { hash: '0x02', to, valueWei: '2500000', at: 300, token: 'USDC' },
  ]
  const received: CheckoutReceipt[] = [
    { hash: '0x03', token: 'USDC', amountBase: 5_000_000n, receivedAt: 200, status: 'success' },
    { token: 'MON', amountBase: 10n ** 17n, receivedAt: 400, status: 'success' },
    { hash: '0x05', amountBase: 1n, receivedAt: 500, status: 'timeout' },
  ]

  it('filters by token and sorts newest first', () => {
    const usdc = assetActivity('usdc', sent, received)
    expect(usdc.map(i => [i.kind, i.hash])).toEqual([['sent', '0x02'], ['received', '0x03']])
    const mon = assetActivity('mon', sent, received)
    expect(mon.map(i => i.kind)).toEqual(['received', 'sent'])
    expect(mon[0]!.hash).toBeUndefined()
    expect(mon[1]!.counterparty).toBe(to)
  })

  it('treats legacy activity without token as MON and legacy receipts as USDC', () => {
    const items = assetActivity('usdc', [], [{ hash: '0x09', amountBase: 1n, receivedAt: 1, status: 'success' }])
    expect(items).toHaveLength(1)
    expect(assetActivity('usdc', [sent[0]!], [])).toHaveLength(0)
  })
})
