import { describe, expect, it } from 'vitest'
import { formatEther, parseEther } from 'viem'

import {
  amountPresetsFor,
  formatMaxMonAmount,
  formatMaxPayAmount,
  formatMaxUsdcAmount,
  monMaxGasReserve,
  trimAmountText,
} from '../app/lib/pay-amount'
import { estimateTransferGasCost } from '../app/lib/sponsored'

describe('amountPresetsFor', () => {
  it('returns USDC presets', () => {
    expect(amountPresetsFor('usdc')).toEqual(['10', '50', '100'])
  })

  it('returns MON presets', () => {
    expect(amountPresetsFor('mon')).toEqual(['0.01', '0.05', '0.1'])
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
