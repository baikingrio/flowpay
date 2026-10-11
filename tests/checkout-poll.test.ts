import { describe, expect, it } from 'vitest'
import type { TransferLog } from '../app/lib/checkout-match'
import { createRequestGate, matchTransferLog, newCheckoutRequestId, nextScanWindow, startBlockFor } from '../app/lib/checkout-match'
import { readCheckoutIntent, stashCheckoutIntent } from '../app/lib/pending-checkout'

const MERCHANT = '0x00000000000000000000000000000000000000Aa' as const
const OTHER = '0x0000000000000000000000000000000000000002' as const
const intent = { expectedTo: MERCHANT, amountBase: 1_500_000n }

function log(partial: Partial<TransferLog>): TransferLog {
  return { hash: '0xaaa', to: MERCHANT, value: 1_500_000n, blockNumber: 100n, ...partial }
}

describe('block-based matching', () => {
  it('matches at or after startBlock, case-insensitive recipient', () => {
    const match = matchTransferLog(intent, [log({ to: MERCHANT.toLowerCase() as `0x${string}`, blockNumber: 100n })], 100n)
    expect(match?.hash).toBe('0xaaa')
  })

  it('ignores transfers mined before the request started', () => {
    expect(matchTransferLog(intent, [log({ blockNumber: 99n })], 100n)).toBeUndefined()
  })

  it('ignores wrong amount or recipient', () => {
    expect(matchTransferLog(intent, [log({ value: 1n }), log({ to: OTHER })], 0n)).toBeUndefined()
  })

  it('skips a hash already recorded in the ledger', () => {
    const logs = [log({ hash: '0xAAA' }), log({ hash: '0xbbb', blockNumber: 101n })]
    const match = matchTransferLog(intent, logs, 0n, new Set(['0xaaa']))
    expect(match?.hash).toBe('0xbbb')
    expect(matchTransferLog(intent, [log({ hash: '0xaaa' })], 0n, new Set(['0xaaa']))).toBeUndefined()
  })

  it('startBlockFor applies a small margin and clamps at 0', () => {
    expect(startBlockFor(1000n)).toBe(995n)
    expect(startBlockFor(3n)).toBe(0n)
  })
})

describe('incremental scan window', () => {
  it('only covers blocks after the cursor', () => {
    expect(nextScanWindow(99n, 120n)).toEqual({ from: 100n, to: 120n })
  })

  it('returns undefined when nothing new', () => {
    expect(nextScanWindow(120n, 120n)).toBeUndefined()
  })

  it('caps one poll at maxBlocks', () => {
    expect(nextScanWindow(0n, 10_000n, 500n)).toEqual({ from: 1n, to: 500n })
  })
})

describe('request gate', () => {
  it('drops results from a stale request (cancel / 再收一笔 / replaced)', () => {
    const gate = createRequestGate()
    gate.begin('a')
    expect(gate.tryEnter('a')).toBe(true)
    gate.end() // startOver
    expect(gate.isActive('a')).toBe(false)
    expect(gate.claimSuccess('a')).toBe(false)

    gate.begin('b')
    gate.leave('a') // late finally from the old poll must not unlock b
    expect(gate.claimSuccess('a')).toBe(false)
    expect(gate.isActive('b')).toBe(true)
  })

  it('allows only one poll in flight per request', () => {
    const gate = createRequestGate()
    gate.begin('a')
    expect(gate.tryEnter('a')).toBe(true)
    expect(gate.tryEnter('a')).toBe(false)
    gate.leave('a')
    expect(gate.tryEnter('a')).toBe(true)
  })

  it('claims success exactly once', () => {
    const gate = createRequestGate()
    gate.begin('a')
    expect(gate.claimSuccess('a')).toBe(true)
    expect(gate.claimSuccess('a')).toBe(false)
    expect(gate.isActive('a')).toBe(false)
    expect(gate.tryEnter('a')).toBe(false)
  })

  it('generates distinct request ids', () => {
    expect(newCheckoutRequestId()).not.toBe(newCheckoutRequestId())
  })
})

describe('intent persistence', () => {
  function memoryStorage(): Storage {
    const m = new Map<string, string>()
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => m.set(k, v),
      removeItem: (k: string) => m.delete(k),
    } as Storage
  }

  it('round-trips id and startBlock', () => {
    const storage = memoryStorage()
    stashCheckoutIntent({ expectedTo: MERCHANT, amountBase: 1n, startedAt: 1, token: OTHER, id: 'r1', startBlock: 12345n }, storage)
    const read = readCheckoutIntent(storage)
    expect(read?.id).toBe('r1')
    expect(read?.startBlock).toBe(12345n)
  })

  it('reads old intents without id/startBlock', () => {
    const storage = memoryStorage()
    storage.setItem('flowpay.checkoutIntent', JSON.stringify({ expectedTo: MERCHANT, amountBase: '1', startedAt: 1, token: OTHER }))
    const read = readCheckoutIntent(storage)
    expect(read?.id).toBeUndefined()
    expect(read?.startBlock).toBeUndefined()
  })
})
