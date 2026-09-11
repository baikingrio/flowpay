import { describe, expect, it } from 'vitest'
import { formatUsdcFromBase, parseUsdcToBase } from '../app/lib/usdc-amount'

describe('parseUsdcToBase', () => {
  it('parses whole and fractional', () => {
    expect(parseUsdcToBase('12.5')).toBe(12_500_000n)
    expect(parseUsdcToBase('0.000001')).toBe(1n)
  })

  it('rejects too many decimals', () => {
    expect(() => parseUsdcToBase('1.1234567')).toThrow()
  })

  it('rejects empty/negative', () => {
    expect(() => parseUsdcToBase('')).toThrow()
    expect(() => parseUsdcToBase('-1')).toThrow()
  })
})

describe('formatUsdcFromBase', () => {
  it('formats', () => {
    expect(formatUsdcFromBase(12_500_000n)).toBe('12.5')
    expect(formatUsdcFromBase(1n)).toBe('0.000001')
  })
})
