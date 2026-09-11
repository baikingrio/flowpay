export interface CheckoutIntent {
  expectedTo: `0x${string}`
  amountBase: bigint
  startedAt: number
  token: `0x${string}`
}

export interface TransferCandidate {
  hash: `0x${string}`
  to: `0x${string}`
  value: bigint
  timestampMs: number
}

export function matchCheckoutTransfer(
  intent: CheckoutIntent,
  transfers: TransferCandidate[],
  nowMs: number,
  windowMs: number = 300_000,
): TransferCandidate | undefined {
  const deadline = intent.startedAt + windowMs

  if (nowMs > deadline)
    return undefined

  for (const transfer of transfers) {
    if (
      transfer.to.toLowerCase() === intent.expectedTo.toLowerCase()
      && transfer.value === intent.amountBase
      && transfer.timestampMs >= intent.startedAt
      && transfer.timestampMs <= deadline
    ) {
      return transfer
    }
  }

  return undefined
}
