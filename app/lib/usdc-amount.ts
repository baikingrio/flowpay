import { USDC_DECIMALS } from './tokens'

export function parseUsdcToBase(input: string): bigint {
  const raw = input.trim()
  if (!raw || raw.startsWith('-'))
    throw new Error('invalid_usdc_amount')
  const parts = raw.split('.')
  const whole = parts[0] || '0'
  const frac = parts[1] || ''
  if (frac.length > USDC_DECIMALS)
    throw new Error('invalid_usdc_amount')
  if (!/^\d+$/.test(whole) || (frac.length > 0 && !/^\d+$/.test(frac)))
    throw new Error('invalid_usdc_amount')
  const padded = frac.padEnd(USDC_DECIMALS, '0')
  return BigInt(whole) * 10n ** BigInt(USDC_DECIMALS) + BigInt(padded || '0')
}

export function formatUsdcFromBase(amount: bigint): string {
  if (amount < 0n)
    throw new Error('invalid_usdc_amount')
  const base = 10n ** BigInt(USDC_DECIMALS)
  const whole = amount / base
  const frac = (amount % base).toString().padStart(USDC_DECIMALS, '0').replace(/0+$/, '')
  return frac.length === 0 ? whole.toString() : `${whole}.${frac}`
}
