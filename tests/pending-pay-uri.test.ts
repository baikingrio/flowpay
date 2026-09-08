import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearPendingPayUri,
  readPendingPayUri,
  stashPendingPayUri,
} from '../app/lib/pending-pay-uri'

const store = new Map<string, string>()

describe('pending pay uri', () => {
  beforeEach(() => store.clear())

  it('roundtrips', () => {
    stashPendingPayUri('ethereum:0xabc@10143', storeAsStorage())
    expect(readPendingPayUri(storeAsStorage())).toBe('ethereum:0xabc@10143')
    clearPendingPayUri(storeAsStorage())
    expect(readPendingPayUri(storeAsStorage())).toBeUndefined()
  })
})

function storeAsStorage(): Storage {
  return {
    get length() { return store.size },
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v) },
    removeItem: (k) => { store.delete(k) },
    key: () => null,
  }
}
