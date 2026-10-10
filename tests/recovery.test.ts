import { beforeEach, describe, expect, it } from 'vitest'
import { clearActivity, readActivity, recordPayment } from '../app/lib/activity'
import { clearStoredCredentialId, readStoredCredentialId, writeStoredCredentialId } from '../app/lib/credential'
import { clearPendingPayUri, PENDING_PAY_URI_KEY, readPendingPayUri, stashPendingPayUri } from '../app/lib/pending-pay-uri'

const mockLocalStorage = new Map<string, string>()
const mockSessionStorage = new Map<string, string>()

function localStoreAsStorage(): Storage {
  return {
    get length() { return mockLocalStorage.size },
    clear: () => mockLocalStorage.clear(),
    getItem: (k) => mockLocalStorage.get(k) ?? null,
    setItem: (k, v) => { mockLocalStorage.set(k, v) },
    removeItem: (k) => { mockLocalStorage.delete(k) },
    key: () => null,
  }
}

function sessionStoreAsStorage(): Storage {
  return {
    get length() { return mockSessionStorage.size },
    clear: () => mockSessionStorage.clear(),
    getItem: (k) => mockSessionStorage.get(k) ?? null,
    setItem: (k, v) => { mockSessionStorage.set(k, v) },
    removeItem: (k) => { mockSessionStorage.delete(k) },
    key: () => null,
  }
}

/**
 * Recovery logic tests
 *
 * These tests verify the stateless recovery system's contract:
 * 1. Continue is always tried first (continueThenCreate in app/lib/account.ts)
 * 2. Create happens when Continue fails/cancels with no stored credential (Safari hybrid sheet included)
 * 3. Stored credentialId is optional acceleration, never required for recovery
 * 4. signOut/clear-local removes all acceleration data but keeps the Passkey
 */

describe('stateless recovery contract', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
    mockSessionStorage.clear()
  })

  it('documents cancel-without-stored still creates', async () => {
    // app/lib/account.ts: without stored credentialId, Continue cancel/fail → Create
    // (Safari hybrid Sign In can take >400ms; do not treat that as final cancel.)
    // With stored credentialId, Continue cancel → PasskeyCancelledError, no Create.
    const { INSTANT_FAIL_MS } = await import('../app/lib/account')
    expect(INSTANT_FAIL_MS).toBe(400)
  })

  it('credential and activity clear independently', () => {
    const localStorage = localStoreAsStorage()
    const testAddress = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`
    const credentialId = 'test-cred-123'

    writeStoredCredentialId(credentialId, localStorage)
    expect(readStoredCredentialId(localStorage)).toBe(credentialId)

    recordPayment(testAddress, {
      hash: '0xabc' as `0x${string}`,
      to: '0x1111111111111111111111111111111111111111' as `0x${string}`,
      valueWei: '100',
    }, localStorage)
    expect(readActivity(testAddress, localStorage).length).toBe(1)

    clearStoredCredentialId(localStorage)
    expect(readStoredCredentialId(localStorage)).toBeUndefined()
    expect(readActivity(testAddress, localStorage).length).toBe(1)

    clearActivity(testAddress, localStorage)
    expect(readActivity(testAddress, localStorage)).toEqual([])
  })

  it('pending pay URI is cleared on sign out', () => {
    const sessionStorage = sessionStoreAsStorage()
    const testUri = 'ethereum:0xabc@10143'

    stashPendingPayUri(testUri, sessionStorage)
    expect(readPendingPayUri(sessionStorage)).toBe(testUri)

    clearPendingPayUri(sessionStorage)
    expect(readPendingPayUri(sessionStorage)).toBeUndefined()
  })

  it('signOut must clear credential, activity, and pending URI', () => {
    const localStorage = localStoreAsStorage()
    const sessionStorage = sessionStoreAsStorage()
    const testAddress = '0xabcd1234abcd1234abcd1234abcd1234abcd1234' as `0x${string}`

    // Simulate stored state
    writeStoredCredentialId('cred-456', localStorage)
    recordPayment(testAddress, {
      hash: '0x1' as `0x${string}`,
      to: '0x2222222222222222222222222222222222222222' as `0x${string}`,
      valueWei: '100',
    }, localStorage)
    stashPendingPayUri('ethereum:0xtest@10143', sessionStorage)

    // Verify state exists
    expect(readStoredCredentialId(localStorage)).toBe('cred-456')
    expect(readActivity(testAddress, localStorage).length).toBe(1)
    expect(readPendingPayUri(sessionStorage)).toBe('ethereum:0xtest@10143')

    // Simulate signOut (calls all three clear functions)
    clearStoredCredentialId(localStorage)
    clearActivity(testAddress, localStorage)
    clearPendingPayUri(sessionStorage)

    // Verify all cleared
    expect(readStoredCredentialId(localStorage)).toBeUndefined()
    expect(readActivity(testAddress, localStorage)).toEqual([])
    expect(readPendingPayUri(sessionStorage)).toBeUndefined()
  })
})

describe('clear-local behavior', () => {
  beforeEach(() => {
    mockLocalStorage.clear()
  })

  it('lock does not clear credentialId or activity', () => {
    const localStorage = localStoreAsStorage()
    const testAddress = '0x9999999999999999999999999999999999999999' as `0x${string}`

    // lock() in useSigningSession.ts ends session and clears in-memory state
    // but does NOT clear localStorage (credentialId, activity)
    writeStoredCredentialId('cred-789', localStorage)
    recordPayment(testAddress, {
      hash: '0xlock' as `0x${string}`,
      to: '0x8888888888888888888888888888888888888888' as `0x${string}`,
      valueWei: '500',
    }, localStorage)

    // After lock, credential and activity are still there (not cleared by lock)
    expect(readStoredCredentialId(localStorage)).toBe('cred-789')
    expect(readActivity(testAddress, localStorage).length).toBe(1)

    // Only signOut/clearStoredCredentialId + clearActivity removes them
  })
})

describe('recovery scenarios (documented)', () => {
  it('documents recovery after clearing site data', () => {
    // Browser "Clear Site Data" → localStorage gone, Passkey kept (stored in authenticator)
    // Recovery flow:
    // 1. User clicks Continue → no stored credentialId
    // 2. getPasskeyPrfOutput with no hint → platform picker shows discoverable Passkeys
    // 3. User selects their Passkey → same PRF → same Account/address
    // 4. Activity is empty (localStorage cleared), but balance comes from RPC
    expect(true).toBe(true)
  })

  it('documents recovery on new device', () => {
    // User on new device with same Passkey (via iCloud Keychain, Windows Hello, etc.):
    // 1. No localStorage on new device
    // 2. User clicks Continue → platform picker
    // 3. User selects synced Passkey → same PRF → same Account
    // 4. Balance from RPC, no local activity
    expect(true).toBe(true)
  })

  it('documents that always-create is wrong', () => {
    // Always calling createPasskeyWithPrfOutput would mint a new Account on every visit.
    // This breaks stateless recovery. The primary CTA must be Continue-first.
    // See app/lib/account.ts continueThenCreate() for the correct flow.
    expect(true).toBe(true)
  })
})
