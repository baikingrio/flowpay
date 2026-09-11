import { describe, expect, it } from 'vitest'
import { blockRanges } from '../app/lib/block-ranges'

describe('blockRanges', () => {
  it('splits range larger than maxSpan into multiple chunks', () => {
    const result = blockRanges(100n, 250n, 100)
    expect(result).toEqual([
      [100n, 199n],
      [200n, 250n],
    ])
  })

  it('returns single chunk when range equals maxSpan', () => {
    const result = blockRanges(0n, 99n, 100)
    expect(result).toEqual([[0n, 99n]])
  })

  it('returns single chunk when range is smaller than maxSpan', () => {
    const result = blockRanges(50n, 75n, 100)
    expect(result).toEqual([[50n, 75n]])
  })

  it('handles exact multiples of maxSpan', () => {
    const result = blockRanges(0n, 299n, 100)
    expect(result).toEqual([
      [0n, 99n],
      [100n, 199n],
      [200n, 299n],
    ])
  })

  it('returns empty array when from > to', () => {
    const result = blockRanges(100n, 50n, 100)
    expect(result).toEqual([])
  })

  it('handles single block range', () => {
    const result = blockRanges(42n, 42n, 100)
    expect(result).toEqual([[42n, 42n]])
  })

  it('uses default maxSpan of 100', () => {
    const result = blockRanges(0n, 250n)
    expect(result).toEqual([
      [0n, 99n],
      [100n, 199n],
      [200n, 250n],
    ])
  })

  it('handles large ranges', () => {
    const result = blockRanges(1000n, 3500n, 100)
    expect(result.length).toBe(26)
    expect(result[0]).toEqual([1000n, 1099n])
    expect(result[25]).toEqual([3500n, 3500n])
  })
})
