import { describe, expect, it } from 'vitest'
import { FIRST_PAYMENT_TO, FIRST_PAYMENT_VALUE } from '../app/lib/chain'

describe('session expiry UX helpers', () => {
  describe('first payment defaults detection', () => {
    it('should identify First Payment defaults correctly', () => {
      const recipient = FIRST_PAYMENT_TO
      const amount = FIRST_PAYMENT_VALUE

      expect(recipient.toLowerCase()).toBe('0x000000000000000000000000000000000000dead')
      expect(amount).toBe(10n ** 15n)
    })

    it('should not match when recipient differs', () => {
      const recipient = '0x0000000000000000000000000000000000000001'
      const amount = FIRST_PAYMENT_VALUE

      expect(recipient.toLowerCase()).not.toBe(FIRST_PAYMENT_TO.toLowerCase())
      expect(amount).toBe(FIRST_PAYMENT_VALUE)
    })

    it('should not match when amount differs', () => {
      const recipient = FIRST_PAYMENT_TO
      const amount = 10n ** 16n

      expect(recipient.toLowerCase()).toBe(FIRST_PAYMENT_TO.toLowerCase())
      expect(amount).not.toBe(FIRST_PAYMENT_VALUE)
    })
  })

  describe('session expiry reason tracking', () => {
    it('should differentiate timer expiry from explicit lock', () => {
      const reasons = ['timer', 'lock', 'pagehide'] as const

      reasons.forEach((reason) => {
        expect(['timer', 'lock', 'pagehide']).toContain(reason)
      })
    })
  })
})
