import { describe, expect, it, vi } from 'vitest'
import { estimateTransferGasCost, isSponsorshipAvailable, needsSponsorship } from '../app/lib/sponsored'

describe('sponsored', () => {
  describe('isSponsorshipAvailable', () => {
    it('returns false when API key is not set', () => {
      expect(isSponsorshipAvailable()).toBe(false)
    })

    // Note: In production, this would be true when NUXT_PUBLIC_PIMLICO_API_KEY is set
    // Testing with actual API key would require integration tests
  })

  describe('estimateTransferGasCost', () => {
    it('returns a conservative gas cost estimate', () => {
      const cost = estimateTransferGasCost()
      // 25,000 gas * 10 gwei = 0.00025 MON
      const expected = 25000n * 10n * 10n ** 9n
      expect(cost).toBe(expected)
    })

    it('estimate is in wei', () => {
      const cost = estimateTransferGasCost()
      // Should be a reasonable gas cost in wei (> 0, < 1 MON)
      expect(cost).toBeGreaterThan(0n)
      expect(cost).toBeLessThan(10n ** 18n) // Less than 1 MON
    })
  })

  describe('needsSponsorship', () => {
    it('returns true when balance cannot cover gas + value', () => {
      const balance = 10n ** 15n // 0.001 MON
      const value = 10n ** 15n // 0.001 MON
      // Gas cost ~0.00025 MON, so 0.001 < 0.001 + 0.00025
      expect(needsSponsorship(balance, value)).toBe(true)
    })

    it('returns false when balance can cover gas + value', () => {
      const balance = 10n ** 18n // 1 MON
      const value = 10n ** 15n // 0.001 MON
      // 1 MON is enough for 0.001 + gas
      expect(needsSponsorship(balance, value)).toBe(false)
    })

    it('returns true for zero balance', () => {
      const balance = 0n
      const value = 10n ** 15n
      expect(needsSponsorship(balance, value)).toBe(true)
    })

    it('handles exact balance edge case', () => {
      const value = 10n ** 15n
      const gasCost = estimateTransferGasCost()
      const balance = value + gasCost - 1n // Just under the threshold
      expect(needsSponsorship(balance, value)).toBe(true)
    })

    it('returns false when balance exactly covers gas + value', () => {
      const value = 10n ** 15n
      const gasCost = estimateTransferGasCost()
      const balance = value + gasCost
      expect(needsSponsorship(balance, value)).toBe(false)
    })
  })
})
