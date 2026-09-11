import { describe, expect, it } from 'vitest'
import { buildSwapPath, calculateMinAmountOut, getRouterAddress, getUsdcAddress, getWmonAddress } from '../app/lib/swap'

describe('swap', () => {
  describe('verified contract addresses', () => {
    it('returns live router address verified on testnet', () => {
      const router = getRouterAddress()
      // Verified via eth_getCode on https://testnet-rpc.monad.xyz
      // Returns 35890 bytes of bytecode (non-empty)
      expect(router).toBe('0x430c23895c8D44883526e3E0B09327dAD8766660')
      expect(router).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })

    it('returns live USDC token address verified on testnet', () => {
      const usdc = getUsdcAddress()
      // Verified via eth_getCode on https://testnet-rpc.monad.xyz
      // Returns 3598 bytes of bytecode (non-empty)
      expect(usdc).toBe('0x534b2f3A21130d7a60830c2Df862319e593943A3')
      expect(usdc).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })

    it('returns live WMON address used by router', () => {
      const wmon = getWmonAddress()
      // Verified via eth_getCode on https://testnet-rpc.monad.xyz
      // Returns 4618 bytes of bytecode (non-empty)
      // This is router.WETH(), not canonical WMON
      expect(wmon).toBe('0x97b3070f9da6c002343862b35e68bd8e22608943')
      expect(wmon).toMatch(/^0x[0-9a-fA-F]{40}$/)
    })
  })

  describe('swap path construction', () => {
    it('builds correct path for MON to USDC', () => {
      const path = buildSwapPath('monToUsdc')
      expect(path).toEqual([
        '0x97b3070f9da6c002343862b35e68bd8e22608943', // WMON
        '0x534b2f3A21130d7a60830c2Df862319e593943A3', // USDC
      ])
    })

    it('builds correct path for USDC to MON', () => {
      const path = buildSwapPath('usdcToMon')
      expect(path).toEqual([
        '0x534b2f3A21130d7a60830c2Df862319e593943A3', // USDC
        '0x97b3070f9da6c002343862b35e68bd8e22608943', // WMON
      ])
    })
  })

  describe('slippage calculation', () => {
    it('calculates minimum amount with 2% slippage', () => {
      const amountOut = 1000000n
      const minAmount = calculateMinAmountOut(amountOut, 2)
      expect(minAmount).toBe(980000n) // 98% of 1000000
    })

    it('calculates minimum amount with 5% slippage', () => {
      const amountOut = 1000n
      const minAmount = calculateMinAmountOut(amountOut, 5)
      expect(minAmount).toBe(950n) // 95% of 1000
    })

    it('calculates minimum amount with 0% slippage', () => {
      const amountOut = 1000n
      const minAmount = calculateMinAmountOut(amountOut, 0)
      expect(minAmount).toBe(1000n) // 100% of 1000
    })

    it('throws error for negative slippage', () => {
      expect(() => calculateMinAmountOut(1000n, -1)).toThrow('Slippage must be between 0 and 100')
    })

    it('throws error for slippage over 100%', () => {
      expect(() => calculateMinAmountOut(1000n, 101)).toThrow('Slippage must be between 0 and 100')
    })
  })
})
