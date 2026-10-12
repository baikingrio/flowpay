import { formatEther } from 'viem'

import { estimateTransferGasCost } from './sponsored'
import { formatUsdcFromBase } from './usdc-amount'

export type PayAsset = 'mon' | 'usdc'

/** Testnet-sized presets shown as quick-amount chips on the pay page. */
export const USDC_AMOUNT_PRESETS = ['10', '50', '100'] as const
export const MON_AMOUNT_PRESETS = ['0.01', '0.05', '0.1'] as const

export function amountPresetsFor(asset: PayAsset): readonly string[] {
  return asset === 'usdc' ? USDC_AMOUNT_PRESETS : MON_AMOUNT_PRESETS
}

/**
 * Gas left behind when sending Max MON.
 * Same estimate as `estimateTransferGasCost` / `needsSponsorship` in sponsored.ts
 * (25_000 gas × 10 gwei = 0.00025 MON). The live send path only requires
 * `balance > value`, but Max must leave a realistic fee or the tx fails.
 */
export function monMaxGasReserve(): bigint {
  return estimateTransferGasCost()
}

/** Trim trailing zeros after the decimal point ("1.2300" → "1.23", "1.0" → "1"). */
export function trimAmountText(value: string): string {
  if (!value.includes('.'))
    return value
  return value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

/**
 * Max sendable mUSDC for the amount field. Full balance, up to 6 decimals,
 * trailing zeros trimmed. Undefined when there is nothing to send.
 */
export function formatMaxUsdcAmount(usdcBase: bigint): string | undefined {
  if (usdcBase <= 0n)
    return undefined
  return formatUsdcFromBase(usdcBase)
}

/**
 * Max sendable MON for the amount field: balance minus gas reserve.
 * Undefined when balance cannot cover the reserve (Max should no-op / stay disabled).
 */
export function formatMaxMonAmount(
  balanceWei: bigint,
  gasReserve: bigint = monMaxGasReserve(),
): string | undefined {
  if (balanceWei <= gasReserve)
    return undefined
  return trimAmountText(formatEther(balanceWei - gasReserve))
}

/** Max amount text for the selected asset, or undefined when Max is not available. */
export function formatMaxPayAmount(
  asset: PayAsset,
  balances: { usdcBase?: bigint, balanceWei?: bigint },
): string | undefined {
  if (asset === 'usdc') {
    if (balances.usdcBase === undefined)
      return undefined
    return formatMaxUsdcAmount(balances.usdcBase)
  }
  if (balances.balanceWei === undefined)
    return undefined
  return formatMaxMonAmount(balances.balanceWei)
}
