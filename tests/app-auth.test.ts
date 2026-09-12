import { beforeEach, describe, expect, it } from 'vitest'
import { clearAppAuth, readAppAuth, writeAppAuth } from '../app/lib/app-auth'
import type { AppAuthSession } from '../app/lib/app-auth'

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

describe('app auth storage', () => {
  beforeEach(() => {
    store.clear()
  })

  it('reads undefined when no auth is stored', () => {
    expect(readAppAuth(storeAsStorage())).toBeUndefined()
  })

  it('roundtrips GitHub mock auth session', () => {
    const storage = storeAsStorage()
    const session: AppAuthSession = {
      provider: 'github',
      login: 'demo-dev',
      name: 'Demo Developer',
      avatarUrl: 'https://avatars.githubusercontent.com/u/1234?v=4',
      mock: true,
      authAt: Date.now(),
    }

    writeAppAuth(session, storage)
    const read = readAppAuth(storage)
    expect(read).toEqual(session)

    clearAppAuth(storage)
    expect(readAppAuth(storage)).toBeUndefined()
  })

  it('handles GitHub session without avatarUrl', () => {
    const storage = storeAsStorage()
    const session: AppAuthSession = {
      provider: 'github',
      login: 'test-user',
      name: 'Test User',
      mock: true,
      authAt: Date.now(),
    }

    writeAppAuth(session, storage)
    const read = readAppAuth(storage)
    expect(read).toEqual(session)
    expect(read?.avatarUrl).toBeUndefined()
  })

  it('clears auth session', () => {
    const storage = storeAsStorage()
    const session: AppAuthSession = {
      provider: 'github',
      login: 'demo-dev',
      name: 'Demo Developer',
      mock: true,
      authAt: Date.now(),
    }

    writeAppAuth(session, storage)
    expect(readAppAuth(storage)).toEqual(session)

    clearAppAuth(storage)
    expect(readAppAuth(storage)).toBeUndefined()
    expect(store.get('flowpay.appAuth')).toBeUndefined()
  })

  it('stores under correct key', () => {
    const storage = storeAsStorage()
    const session: AppAuthSession = {
      provider: 'github',
      login: 'demo-dev',
      name: 'Demo Developer',
      mock: true,
      authAt: Date.now(),
    }

    writeAppAuth(session, storage)
    const raw = store.get('flowpay.appAuth')
    expect(raw).toBeDefined()
    expect(JSON.parse(raw!)).toEqual(session)
  })

  it('handles corrupted JSON gracefully', () => {
    const storage = storeAsStorage()
    store.set('flowpay.appAuth', 'not-json{')
    expect(readAppAuth(storage)).toBeUndefined()
  })

  it('rejects invalid session shape', () => {
    const storage = storeAsStorage()
    store.set('flowpay.appAuth', JSON.stringify({ provider: 'github' }))
    expect(readAppAuth(storage)).toBeUndefined()
  })

  it('only accepts github provider', () => {
    const storage = storeAsStorage()
    const session = {
      provider: 'unknown',
      login: 'test',
      name: 'Test',
      mock: true,
      authAt: Date.now(),
    }
    store.set('flowpay.appAuth', JSON.stringify(session))
    expect(readAppAuth(storage)).toBeUndefined()
  })

  it('requires mock flag to be true', () => {
    const storage = storeAsStorage()
    const session = {
      provider: 'github',
      login: 'test',
      name: 'Test',
      mock: false,
      authAt: Date.now(),
    }
    store.set('flowpay.appAuth', JSON.stringify(session))
    expect(readAppAuth(storage)).toBeUndefined()
  })
})
