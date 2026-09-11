import { describe, expect, it } from 'vitest'
import type { CheckoutIntent, TransferCandidate } from '../app/lib/checkout-match'
import { matchCheckoutTransfer } from '../app/lib/checkout-match'

const MERCHANT = '0x0000000000000000000000000000000000000001' as const
const OTHER = '0x0000000000000000000000000000000000000002' as const

describe('matchCheckoutTransfer', () => {
  const intent: CheckoutIntent = {
    expectedTo: MERCHANT,
    amountBase: 100_000n,
    startedAt: 1000,
    token: '0x534b2f3A21130d7a60830c2Df862319e593943A3',
  }

  it('matches exact amount and recipient', () => {
    const transfers: TransferCandidate[] = [
      {
        hash: '0xabc',
        to: MERCHANT,
        value: 100_000n,
        timestampMs: 2000,
      },
    ]
    const match = matchCheckoutTransfer(intent, transfers, 3000)
    expect(match).toEqual(transfers[0])
  })

  it('rejects wrong recipient', () => {
    const transfers: TransferCandidate[] = [
      {
        hash: '0xabc',
        to: OTHER,
        value: 100_000n,
        timestampMs: 2000,
      },
    ]
    const match = matchCheckoutTransfer(intent, transfers, 3000)
    expect(match).toBeUndefined()
  })

  it('rejects wrong amount', () => {
    const transfers: TransferCandidate[] = [
      {
        hash: '0xabc',
        to: MERCHANT,
        value: 99_999n,
        timestampMs: 2000,
      },
    ]
    const match = matchCheckoutTransfer(intent, transfers, 3000)
    expect(match).toBeUndefined()
  })

  it('rejects transfer before startedAt', () => {
    const transfers: TransferCandidate[] = [
      {
        hash: '0xabc',
        to: MERCHANT,
        value: 100_000n,
        timestampMs: 500,
      },
    ]
    const match = matchCheckoutTransfer(intent, transfers, 3000)
    expect(match).toBeUndefined()
  })

  it('rejects transfer outside window', () => {
    const transfers: TransferCandidate[] = [
      {
        hash: '0xabc',
        to: MERCHANT,
        value: 100_000n,
        timestampMs: 2000,
      },
    ]
    const match = matchCheckoutTransfer(intent, transfers, 400_000, 300_000)
    expect(match).toBeUndefined()
  })

  it('returns first match when multiple candidates', () => {
    const transfers: TransferCandidate[] = [
      {
        hash: '0xfirst',
        to: MERCHANT,
        value: 100_000n,
        timestampMs: 2000,
      },
      {
        hash: '0xsecond',
        to: MERCHANT,
        value: 100_000n,
        timestampMs: 2500,
      },
    ]
    const match = matchCheckoutTransfer(intent, transfers, 3000)
    expect(match?.hash).toBe('0xfirst')
  })

  it('accepts transfer at exact window boundary', () => {
    const transfers: TransferCandidate[] = [
      {
        hash: '0xabc',
        to: MERCHANT,
        value: 100_000n,
        timestampMs: 301_000,
      },
    ]
    const match = matchCheckoutTransfer(intent, transfers, 301_000, 300_000)
    expect(match).toEqual(transfers[0])
  })
})
