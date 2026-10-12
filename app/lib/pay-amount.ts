import { formatEther } from 'viem'

import { estimateTransferGasCost } from './sponsored'
import { formatUsdcFromBase } from './usdc-amount'

export type PayAsset = 'mon' | 'usdc'

/** Percent chips on the pay page (Max is separate, labeled via i18n). */
export const PAY_AMOUNT_PERCENTS = [25, 50, 75] as const
export type PayAmountPercent = (typeof PAY_AMOUNT_PERCENTS)[number]

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

/** Max sendable in base units (USDC 6 decimals / MON wei). Undefined when Max is unavailable. */
export function maxSendableBase(
  asset: PayAsset,
  balances: { usdcBase?: bigint, balanceWei?: bigint },
): bigint | undefined {
  if (asset === 'usdc') {
    if (balances.usdcBase === undefined || balances.usdcBase <= 0n)
      return undefined
    return balances.usdcBase
  }
  if (balances.balanceWei === undefined)
    return undefined
  const gas = monMaxGasReserve()
  if (balances.balanceWei <= gas)
    return undefined
  return balances.balanceWei - gas
}

/**
 * Floor(max × percent / 100) in base units, then format for the amount field.
 * Never exceeds max; returns undefined when Max is unavailable or the percent rounds to 0.
 */
export function formatPercentPayAmount(
  asset: PayAsset,
  balances: { usdcBase?: bigint, balanceWei?: bigint },
  percent: PayAmountPercent,
): string | undefined {
  const max = maxSendableBase(asset, balances)
  if (max === undefined)
    return undefined
  const portion = (max * BigInt(percent)) / 100n
  if (portion <= 0n)
    return undefined
  if (asset === 'usdc')
    return formatUsdcFromBase(portion)
  return trimAmountText(formatEther(portion))
}


