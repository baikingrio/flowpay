import { beforeEach, describe, expect, it } from 'vitest'
import { clearBoundAddress, readBoundAddress, writeBoundAddress } from '../app/lib/bound-address'

const store = new Map<string, string>()

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

describe('bound address storage', () => {
  beforeEach(() => {
    store.clear()
  })

  it('reads undefined when no address is stored', () => {
    expect(readBoundAddress(storeAsStorage())).toBeUndefined()
  })

  it('roundtrips bound address', () => {
    const storage = storeAsStorage()
    const address: `0x${string}` = '0x1234567890123456789012345678901234567890'

    writeBoundAddress(address, storage)
    expect(readBoundAddress(storage)).toBe(address)

    clearBoundAddress(storage)
    expect(readBoundAddress(storage)).toBeUndefined()
  })

  it('clears bound address', () => {
    const storage = storeAsStorage()
    const address: `0x${string}` = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd'

    writeBoundAddress(address, storage)
    expect(readBoundAddress(storage)).toBe(address)

    clearBoundAddress(storage)
    expect(readBoundAddress(storage)).toBeUndefined()
    expect(store.get('flowpay.boundAddress')).toBeUndefined()
  })

  it('stores under correct key', () => {
    const storage = storeAsStorage()
    const address: `0x${string}` = '0x1234567890123456789012345678901234567890'

    writeBoundAddress(address, storage)
    expect(store.get('flowpay.boundAddress')).toBe(address)
  })

  it('validates 0x-prefixed addresses', () => {
    const storage = storeAsStorage()
    
    // Valid address
    writeBoundAddress('0x1234567890123456789012345678901234567890', storage)
    expect(readBoundAddress(storage)).toBe('0x1234567890123456789012345678901234567890')

    // Invalid: no 0x prefix
    store.set('flowpay.boundAddress', '1234567890123456789012345678901234567890')
    expect(readBoundAddress(storage)).toBeUndefined()

    // Invalid: wrong length
    store.set('flowpay.boundAddress', '0x1234')
    expect(readBoundAddress(storage)).toBeUndefined()

    // Invalid: not a string
    store.set('flowpay.boundAddress', 'null')
    expect(readBoundAddress(storage)).toBeUndefined()
  })

  it('handles empty storage gracefully', () => {
    const storage = storeAsStorage()
    expect(readBoundAddress(storage)).toBeUndefined()
  })

  it('preserves address case', () => {
    const storage = storeAsStorage()
    const address: `0x${string}` = '0xaBcDeF1234567890123456789012345678901234'

    writeBoundAddress(address, storage)
    expect(readBoundAddress(storage)).toBe(address)
  })
})
