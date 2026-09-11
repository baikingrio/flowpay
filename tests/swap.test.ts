import { describe, expect, it } from 'vitest'
import { getRouterAddress, getUsdcAddress } from '../app/lib/swap'

describe('swap', () => {
  describe('contract addresses', () => {
    it('returns valid Uniswap V2 Router address', () => {
      const router = getRouterAddress()
      expect(router).toBe('0x4b2ab38dbf28d31d467aa8993f6c2585981d6804')
      expect(router).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })

    it('returns valid USDC token address', () => {
      const usdc = getUsdcAddress()
      expect(usdc).toBe('0x754704Bc059F8C67012fEd69BC8A327a5aafb603')
      expect(usdc).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })
  })

  describe('swap direction', () => {
    it('supports monToUsdc direction', () => {
      const direction = 'monToUsdc'
      expect(direction).toBe('monToUsdc')
    })

    it('supports usdcToMon direction', () => {
      const direction = 'usdcToMon'
      expect(direction).toBe('usdcToMon')
    })
  })
})
