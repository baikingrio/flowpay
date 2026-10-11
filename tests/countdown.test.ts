import { describe, expect, it } from 'vitest'
import { formatCountdown, remainingMs } from '../app/lib/countdown'

describe('countdown', () => {
  it('computes remaining time, clamped at zero', () => {
    expect(remainingMs(1000, 1000, 300_000)).toBe(300_000)
    expect(remainingMs(0, 400_000, 300_000)).toBe(0)
  })
  it('formats m:ss, rounding up', () => {
    expect(formatCountdown(300_000)).toBe('5:00')
    expect(formatCountdown(272_400)).toBe('4:33')
    expect(formatCountdown(500)).toBe('0:01')
    expect(formatCountdown(0)).toBe('0:00')
  })
})
