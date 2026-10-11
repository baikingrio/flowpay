import { getAddress } from 'viem'
import { describe, expect, it } from 'vitest'
import { parsePaymentUri } from '../app/lib/eip681'
import { buildReceivePayLink, buildReceiveUri, matchNativeArrival, receiptTokenFor } from '../app/lib/receive'

const MERCHANT = getAddress('0x742d35cc6634c0532925a3b844bc9e7595f0beb0')
const USDC = getAddress('0x534b2f3a21130d7a60830c2df862319e593943a3')
const ORIGIN = 'https://flowpay-tau-sand.vercel.app'

describe('buildReceiveUri', () => {
  it('builds USDC request with amount', () => {
    const uri = buildReceiveUri({ asset: 'usdc', to: MERCHANT, usdcToken: USDC, amount: 12_500_000n })
    expect(uri).toBe(`ethereum:${USDC}@10143/transfer?address=${MERCHANT}&uint256=12500000`)
  })

  it('builds any-amount USDC request without uint256', () => {
    const uri = buildReceiveUri({ asset: 'usdc', to: MERCHANT, usdcToken: USDC })
    expect(uri).toBe(`ethereum:${USDC}@10143/transfer?address=${MERCHANT}`)
    const parsed = parsePaymentUri(buildReceivePayLink(ORIGIN, uri))
    expect(parsed.ok && parsed.tokenAddress).toBe(USDC)
    expect(parsed.ok && parsed.address).toBe(MERCHANT)
    expect(parsed.ok && parsed.tokenAmount).toBeUndefined()
  })

  it('builds MON request with value', () => {
    const uri = buildReceiveUri({ asset: 'mon', to: MERCHANT, usdcToken: USDC, amount: 15n * 10n ** 17n })
    expect(uri).toBe(`ethereum:${MERCHANT}@10143?value=15e17`)
  })

  it('builds any-amount MON request without value', () => {
    expect(buildReceiveUri({ asset: 'mon', to: MERCHANT, usdcToken: USDC })).toBe(`ethereum:${MERCHANT}@10143`)
    expect(buildReceiveUri({ asset: 'mon', to: MERCHANT, usdcToken: USDC, amount: 0n })).toBe(`ethereum:${MERCHANT}@10143`)
  })
})

describe('MON HTTPS pay link parsing (pay page input)', () => {
  it('round-trips native value through the HTTPS link', () => {
    const value = 1_234_500_000_000_000_000n
    const link = buildReceivePayLink(ORIGIN, buildReceiveUri({ asset: 'mon', to: MERCHANT, usdcToken: USDC, amount: value }))
    expect(link.startsWith(`${ORIGIN}/pay?uri=ethereum%3A`)).toBe(true)
    const parsed = parsePaymentUri(link)
    expect(parsed).toMatchObject({ ok: true, address: MERCHANT, chainId: 10143, valueWei: value })
    expect(parsed.ok && parsed.tokenAddress).toBeUndefined()
  })

  it('parses any-amount MON link as a native request without value', () => {
    const parsed = parsePaymentUri(buildReceivePayLink(ORIGIN, buildReceiveUri({ asset: 'mon', to: MERCHANT, usdcToken: USDC })))
    expect(parsed).toMatchObject({ ok: true, address: MERCHANT, chainId: 10143 })
    expect(parsed.ok && parsed.valueWei).toBeUndefined()
  })

  it('handles trailing slash on origin', () => {
    expect(buildReceivePayLink(`${ORIGIN}/`, 'ethereum:x')).toBe(`${ORIGIN}/pay?uri=ethereum%3Ax`)
  })
})

describe('matchNativeArrival', () => {
  const baselineWei = 5n * 10n ** 18n
  const amountWei = 10n ** 17n

  it('matches when balance grows by exactly the amount', () => {
    expect(matchNativeArrival({ baselineWei, currentWei: baselineWei + amountWei, amountWei })).toBe(true)
  })

  it('matches when balance grows by more than the amount', () => {
    expect(matchNativeArrival({ baselineWei, currentWei: baselineWei + amountWei * 2n, amountWei })).toBe(true)
  })

  it('does not match a smaller increase or a decrease', () => {
    expect(matchNativeArrival({ baselineWei, currentWei: baselineWei + amountWei - 1n, amountWei })).toBe(false)
    expect(matchNativeArrival({ baselineWei, currentWei: baselineWei - amountWei, amountWei })).toBe(false)
    expect(matchNativeArrival({ baselineWei, currentWei: baselineWei, amountWei })).toBe(false)
  })

  it('never matches a zero amount', () => {
    expect(matchNativeArrival({ baselineWei, currentWei: baselineWei + 1n, amountWei: 0n })).toBe(false)
  })
})

describe('receiptTokenFor', () => {
  it('maps assets to ledger tokens', () => {
    expect(receiptTokenFor('usdc')).toBe('USDC')
    expect(receiptTokenFor('mon')).toBe('MON')
  })
})
