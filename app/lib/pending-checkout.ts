import type { CheckoutIntent } from './checkout-match'

const KEY = 'flowpay.checkoutIntent'

export function stashCheckoutIntent(
  intent: CheckoutIntent,
  storage: Storage = sessionStorage,
): void {
  const payload = {
    expectedTo: intent.expectedTo,
    amountBase: intent.amountBase.toString(),
    startedAt: intent.startedAt,
    token: intent.token,
    asset: intent.asset,
    baselineWei: intent.baselineWei?.toString(),
    id: intent.id,
    startBlock: intent.startBlock?.toString(),
  }
  storage.setItem(KEY, JSON.stringify(payload))
}

export function readCheckoutIntent(
  storage: Storage = sessionStorage,
): CheckoutIntent | undefined {
  const raw = storage.getItem(KEY)
  if (!raw)
    return undefined
  try {
    const payload = JSON.parse(raw)
    return {
      expectedTo: payload.expectedTo,
      amountBase: BigInt(payload.amountBase),
      startedAt: payload.startedAt,
      token: payload.token,
      asset: payload.asset === 'mon' ? 'mon' : 'usdc',
      baselineWei: typeof payload.baselineWei === 'string' ? BigInt(payload.baselineWei) : undefined,
      id: typeof payload.id === 'string' ? payload.id : undefined,
      startBlock: typeof payload.startBlock === 'string' ? BigInt(payload.startBlock) : undefined,
    }
  }
  catch {
    return undefined
  }
}

export function clearCheckoutIntent(
  storage: Storage = sessionStorage,
): void {
  storage.removeItem(KEY)
}
