import { describe, expect, it } from 'vitest'
import { formatEther, parseEther } from 'viem'

import {
  PAY_AMOUNT_PERCENTS,
  formatMaxMonAmount,
  formatMaxPayAmount,
  formatMaxUsdcAmount,
  formatPercentPayAmount,
  maxSendableBase,
  monMaxGasReserve,
  trimAmountText,
} from '../app/lib/pay-amount'
import { estimateTransferGasCost } from '../app/lib/sponsored'
import { formatUsdcFromBase } from '../app/lib/usdc-amount'

describe('PAY_AMOUNT_PERCENTS', () => {
  it('exposes 25 / 50 / 75 for both assets', () => {
    expect(PAY_AMOUNT_PERCENTS).toEqual([25, 50, 75])
  })
})

describe('trimAmountText', () => {
  it('trims trailing zeros', () => {
    expect(trimAmountText('1.2300')).toBe('1.23')
    expect(trimAmountText('1.0')).toBe('1')
    expect(trimAmountText('10')).toBe('10')
  })
})

describe('formatMaxUsdcAmount', () => {
  it('formats full balance and trims zeros', () => {
    expect(formatMaxUsdcAmount(100_000_000n)).toBe('100')
    expect(formatMaxUsdcAmount(12_500_000n)).toBe('12.5')
    expect(formatMaxUsdcAmount(1n)).toBe('0.000001')
  })

  it('returns undefined for zero', () => {
    expect(formatMaxUsdcAmount(0n)).toBeUndefined()
  })
})

describe('formatMaxMonAmount', () => {
  it('uses the sponsored gas estimate as reserve', () => {
    expect(monMaxGasReserve()).toBe(estimateTransferGasCost())
  })

  it('subtracts gas reserve and trims', () => {
    const gas = estimateTransferGasCost()
    const balance = parseEther('1')
    expect(formatMaxMonAmount(balance)).toBe(trimAmountText(formatEther(balance - gas)))
  })

  it('returns undefined when balance cannot cover gas', () => {
    const gas = estimateTransferGasCost()
    expect(formatMaxMonAmount(gas)).toBeUndefined()
    expect(formatMaxMonAmount(gas - 1n)).toBeUndefined()
    expect(formatMaxMonAmount(0n)).toBeUndefined()
  })
})

describe('formatMaxPayAmount', () => {
  it('routes by asset and waits for loaded balances', () => {
    expect(formatMaxPayAmount('usdc', {})).toBeUndefined()
    expect(formatMaxPayAmount('usdc', { usdcBase: 0n })).toBeUndefined()
    expect(formatMaxPayAmount('usdc', { usdcBase: 5_000_000n })).toBe('5')

    expect(formatMaxPayAmount('mon', {})).toBeUndefined()
    expect(formatMaxPayAmount('mon', { balanceWei: 0n })).toBeUndefined()
    expect(formatMaxPayAmount('mon', { balanceWei: parseEther('0.05') })).toBeTruthy()
  })
})

describe('maxSendableBase', () => {
  it('returns full USDC base and MON minus gas', () => {
    expect(maxSendableBase('usdc', { usdcBase: 100_000_000n })).toBe(100_000_000n)
    expect(maxSendableBase('usdc', { usdcBase: 0n })).toBeUndefined()
    expect(maxSendableBase('usdc', {})).toBeUndefined()

    const gas = estimateTransferGasCost()
    expect(maxSendableBase('mon', { balanceWei: parseEther('1') })).toBe(parseEther('1') - gas)
    expect(maxSendableBase('mon', { balanceWei: gas })).toBeUndefined()
    expect(maxSendableBase('mon', {})).toBeUndefined()
  })
})

describe('formatPercentPayAmount', () => {
  it('floors USDC percents of max and never exceeds it', () => {
    const usdcBase = 100_000_000n // 100 mUSDC
    expect(formatPercentPayAmount('usdc', { usdcBase }, 25)).toBe('25')
    expect(formatPercentPayAmount('usdc', { usdcBase }, 50)).toBe('50')
    expect(formatPercentPayAmount('usdc', { usdcBase }, 75)).toBe('75')

    // 1 base unit → 25% floors to 0 → undefined
    expect(formatPercentPayAmount('usdc', { usdcBase: 1n }, 25)).toBeUndefined()

    // Odd balance: floor(3_000_001 * 25 / 100) = 750_000 → 0.75
    const odd = 3_000_001n
    const portion = (odd * 25n) / 100n
    expect(portion).toBe(750_000n)
    expect(formatPercentPayAmount('usdc', { usdcBase: odd }, 25)).toBe(formatUsdcFromBase(portion))
    expect(portion).toBeLessThanOrEqual(odd)
  })

  it('floors MON percents of max (after gas reserve)', () => {
    const gas = estimateTransferGasCost()
    const balanceWei = parseEther('1')
    const max = balanceWei - gas
    expect(formatPercentPayAmount('mon', { balanceWei }, 25)).toBe(
      trimAmountText(formatEther((max * 25n) / 100n)),
    )
    expect(formatPercentPayAmount('mon', { balanceWei }, 50)).toBe(
      trimAmountText(formatEther((max * 50n) / 100n)),
    )
    expect(formatPercentPayAmount('mon', { balanceWei }, 75)).toBe(
      trimAmountText(formatEther((max * 75n) / 100n)),
    )
    expect(formatPercentPayAmount('mon', { balanceWei: gas }, 50)).toBeUndefined()
  })

  it('returns undefined when balances are not loaded', () => {
    expect(formatPercentPayAmount('usdc', {}, 50)).toBeUndefined()
    expect(formatPercentPayAmount('mon', {}, 50)).toBeUndefined()
  })
})
