import { describe, expect, it } from 'vitest'
import { FIRST_PAYMENT_TO, FIRST_PAYMENT_VALUE, isFirstPaymentDefaults } from '../app/lib/chain'
import { shouldSetSessionExpired } from '../app/lib/session-expiry'

describe('session expiry UX', () => {
  describe('isFirstPaymentDefaults', () => {
    it('should return true when both recipient and amount match defaults', () => {
      expect(isFirstPaymentDefaults(FIRST_PAYMENT_TO, FIRST_PAYMENT_VALUE)).toBe(true)
    })

    it('should be case-insensitive for recipient address', () => {
      expect(isFirstPaymentDefaults('0x000000000000000000000000000000000000DEAD', FIRST_PAYMENT_VALUE)).toBe(true)
      expect(isFirstPaymentDefaults('0x000000000000000000000000000000000000DeAd', FIRST_PAYMENT_VALUE)).toBe(true)
    })

    it('should return false when recipient differs', () => {
      const differentRecipient = '0x0000000000000000000000000000000000000001'
      expect(isFirstPaymentDefaults(differentRecipient, FIRST_PAYMENT_VALUE)).toBe(false)
    })

    it('should return false when amount differs', () => {
      expect(isFirstPaymentDefaults(FIRST_PAYMENT_TO, 10n ** 16n)).toBe(false)
      expect(isFirstPaymentDefaults(FIRST_PAYMENT_TO, 0n)).toBe(false)
    })

    it('should return false when amount is undefined', () => {
      expect(isFirstPaymentDefaults(FIRST_PAYMENT_TO, undefined)).toBe(false)
    })

    it('should return false when both differ', () => {
      expect(isFirstPaymentDefaults('0x1234567890123456789012345678901234567890', 999n)).toBe(false)
    })
  })

  describe('shouldSetSessionExpired', () => {
    it('should return true for timer reason when address exists', () => {
      expect(shouldSetSessionExpired('timer', true)).toBe(true)
    })

    it('should return true for pagehide reason when address exists', () => {
      expect(shouldSetSessionExpired('pagehide', true)).toBe(true)
    })

    it('should return false for lock reason even when address exists', () => {
      expect(shouldSetSessionExpired('lock', true)).toBe(false)
    })

    it('should return false for error reason even when address exists', () => {
      expect(shouldSetSessionExpired('error', true)).toBe(false)
    })

    it('should return false for any reason when no address exists', () => {
      expect(shouldSetSessionExpired('timer', false)).toBe(false)
      expect(shouldSetSessionExpired('pagehide', false)).toBe(false)
      expect(shouldSetSessionExpired('lock', false)).toBe(false)
      expect(shouldSetSessionExpired('error', false)).toBe(false)
    })

    it('should distinguish mobile pagehide from explicit lock', () => {
      // Mobile pagehide with account = session expired, show Continue
      expect(shouldSetSessionExpired('pagehide', true)).toBe(true)
      // Explicit lock = clear everything, do not show Continue
      expect(shouldSetSessionExpired('lock', true)).toBe(false)
    })
  })
})
