import type { ReceiptToken } from './checkout-ledger'
import { buildErc20TransferUri, buildPaymentUri, toAppPayPath } from './eip681'

/** Assets the receive page can request. */
export type ReceiveAsset = 'usdc' | 'mon'

export const MONAD_TESTNET_CHAIN_ID = 10143

export function receiptTokenFor(asset: ReceiveAsset): ReceiptToken {
  return asset === 'mon' ? 'MON' : 'USDC'
}

/**
 * Build the EIP-681 request for the receive page.
 * - usdc: ERC-20 `transfer` on the USDC contract (uint256 omitted when no amount)
 * - mon: native transfer (`value` omitted when no amount)
 */
export function buildReceiveUri(opts: {
  asset: ReceiveAsset
  to: `0x${string}`
  usdcToken: `0x${string}`
  amount?: bigint
  chainId?: number
}): string {
  const chainId = opts.chainId ?? MONAD_TESTNET_CHAIN_ID
  const amount = opts.amount !== undefined && opts.amount > 0n ? opts.amount : undefined
  if (opts.asset === 'usdc') {
    return buildErc20TransferUri({ token: opts.usdcToken, to: opts.to, amount, chainId })
  }
  return buildPaymentUri({ address: opts.to, chainId, valueWei: amount })
}

/** HTTPS pay link wrapping the EIP-681 URI so a phone camera opens Flowpay's pay page. */
export function buildReceivePayLink(origin: string, uri: string): string {
  return `${origin.replace(/\/$/, '')}${toAppPayPath(uri)}`
}

/**
 * Native MON transfers emit no logs, so arrival is detected by balance delta:
 * the balance must have grown by at least the requested amount since the
 * request was created.
 */
export function matchNativeArrival(opts: {
  baselineWei: bigint
  currentWei: bigint
  amountWei: bigint
}): boolean {
  if (opts.amountWei <= 0n)
    return false
  return opts.currentWei - opts.baselineWei >= opts.amountWei
}
