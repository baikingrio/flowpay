export interface CheckoutIntent {
  expectedTo: `0x${string}`
  amountBase: bigint
  startedAt: number
  token: `0x${string}`
  /** 'usdc' when absent (intents stashed before MON support). */
  asset?: 'usdc' | 'mon'
  /** MON only: wallet balance (wei) when the request was created. */
  baselineWei?: bigint
  /** Unique per receive request; absent on intents stashed before 2026-10-11. */
  id?: string
  /** First block that counts for this request; absent on older intents. */
  startBlock?: bigint
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

/** A USDC Transfer log reduced to what block-based matching needs. */
export interface TransferLog {
  hash: `0x${string}`
  to: `0x${string}`
  value: bigint
  blockNumber: bigint
}

/** How far back from `latest` a new request starts scanning (tx may land as the QR renders). */
export const START_BLOCK_MARGIN = 5n
/** Fallback lookback for intents stashed before `startBlock` existed. */
export const LEGACY_LOOKBACK_BLOCKS = 50n
export const CHECKOUT_WINDOW_MS = 300_000

export function startBlockFor(latest: bigint, margin: bigint = START_BLOCK_MARGIN): bigint {
  return latest > margin ? latest - margin : 0n
}

/**
 * Block-based match: first transfer to the merchant, exact amount, mined at or
 * after the request's start block, whose hash is not already in the ledger.
 */
export function matchTransferLog(
  intent: Pick<CheckoutIntent, 'expectedTo' | 'amountBase'>,
  logs: TransferLog[],
  startBlock: bigint,
  knownHashes: ReadonlySet<string> = new Set(),
): TransferLog | undefined {
  const to = intent.expectedTo.toLowerCase()
  return logs.find(log =>
    log.to.toLowerCase() === to
    && log.value === intent.amountBase
    && log.blockNumber >= startBlock
    && !knownHashes.has(log.hash.toLowerCase()),
  )
}

/**
 * Incremental scan window: blocks after `cursor` up to `latest`, capped at
 * `maxBlocks` per poll so one slow poll never balloons. `undefined` = nothing new.
 */
export function nextScanWindow(
  cursor: bigint,
  latest: bigint,
  maxBlocks: bigint = 500n,
): { from: bigint, to: bigint } | undefined {
  const from = cursor + 1n
  if (from > latest)
    return undefined
  const cap = from + maxBlocks - 1n
  return { from, to: latest < cap ? latest : cap }
}

export function newCheckoutRequestId(): string {
  const c = globalThis.crypto as Crypto | undefined
  if (c && typeof c.randomUUID === 'function')
    return c.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Tracks which receive request is live. Poll results carry the id they were
 * started for; anything not matching the active id (cancelled, 再收一笔,
 * replaced, unmounted) is dropped, and success can only be claimed once.
 */
export function createRequestGate() {
  let activeId: string | undefined
  let settled = false
  let inFlight = false
  return {
    begin(id: string) {
      activeId = id
      settled = false
      inFlight = false
    },
    end() {
      activeId = undefined
      settled = false
      inFlight = false
    },
    get activeId() {
      return activeId
    },
    isActive(id: string | undefined): boolean {
      return id !== undefined && id === activeId && !settled
    },
    /** Single in-flight guard: returns false if a poll for this request is already running. */
    tryEnter(id: string): boolean {
      if (!this.isActive(id) || inFlight)
        return false
      inFlight = true
      return true
    },
    leave(id: string) {
      if (id === activeId)
        inFlight = false
    },
    /** True exactly once per active request; later or stale calls get false. */
    claimSuccess(id: string): boolean {
      if (!this.isActive(id))
        return false
      settled = true
      return true
    },
  }
}

export type RequestGate = ReturnType<typeof createRequestGate>
