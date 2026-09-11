import type { Secp256k1SigningSession } from '@category-labs/mera'

import { readActivity, recordPayment } from '~/lib/activity'
import { continueThenCreate, isMeraError, PasskeyCancelledError } from '~/lib/account'
import { readStoredCredentialId, writeStoredCredentialId } from '~/lib/credential'
import { readBalance, sendPayment } from '~/lib/ledger'
import { useAccountStore } from '~/stores/account'

const SESSION_MS = 10 * 60 * 1000

let session: Secp256k1SigningSession | undefined
let expiresTimer: ReturnType<typeof setTimeout> | undefined
let pagehideBound = false
/** True while a Passkey ceremony / open() is in flight — ignore pagehide from the OS sheet. */
let opening = false

function clearTimer(): void {
  if (expiresTimer !== undefined) {
    clearTimeout(expiresTimer)
    expiresTimer = undefined
  }
}

function mapOpenError(error: unknown): string {
  if (error instanceof PasskeyCancelledError)
    return 'cancelled'
  if (isMeraError(error) && error.code === 'PRF_UNAVAILABLE')
    return 'prfUnavailable'
  return 'passkeyFailed'
}

function endSession(): void {
  clearTimer()
  session?.end()
  session = undefined
  const account = useAccountStore()
  account.hasSession = false
  account.expiresAt = undefined
  if (account.status !== 'error')
    account.status = 'idle'
}

function bindPagehide(): void {
  if (!import.meta.client || pagehideBound)
    return
  pagehideBound = true
  window.addEventListener('pagehide', (event) => {
    // Biometric sheets can fire pagehide; do not destroy an in-flight open.
    if (event.persisted || opening)
      return
    endSession()
  })
}

export function useSigningSession() {
  const account = useAccountStore()
  bindPagehide()

  async function refreshBalance(): Promise<void> {
    if (account.address === undefined)
      return
    account.balanceWei = await readBalance(account.address)
  }

  async function open(): Promise<boolean> {
    if (!import.meta.client)
      return false
    opening = true
    account.status = 'opening'
    account.errorMessage = undefined
    try {
      const opened = await continueThenCreate(readStoredCredentialId())
      clearTimer()
      session?.end()
      session = opened.session
      writeStoredCredentialId(opened.credentialId)
      account.address = opened.address
      account.hasSession = true
      account.expiresAt = Date.now() + SESSION_MS
      account.status = 'ready'
      account.lastTxHash = undefined
      account.activity = readActivity(opened.address)
      expiresTimer = setTimeout(() => {
        endSession()
      }, SESSION_MS)
      // Balance is secondary: never block navigation / mark Passkey as failed.
      void refreshBalance().catch(() => {})
      return true
    }
    catch (error) {
      endSession()
      account.status = 'error'
      account.errorMessage = mapOpenError(error)
      return false
    }
    finally {
      opening = false
    }
  }

  async function send(to: `0x${string}`, value: bigint): Promise<void> {
    if (session === undefined || account.balanceWei === undefined || value <= 0n || account.balanceWei <= value)
      return
    account.status = 'sending'
    account.errorMessage = undefined
    try {
      const hash = await sendPayment(session, to, value)
      account.lastTxHash = hash
      if (account.address !== undefined) {
        account.activity = recordPayment(account.address, {
          hash,
          to,
          valueWei: value.toString(),
        })
      }
      await refreshBalance()
      account.status = 'ready'
    }
    catch {
      account.status = 'error'
      account.errorMessage = 'sendFailed'
      account.hasSession = session !== undefined
    }
  }

  function lock(): void {
    endSession()
    account.address = undefined
    account.balanceWei = undefined
    account.lastTxHash = undefined
    account.activity = []
    account.errorMessage = undefined
    account.status = 'idle'
  }

  return { open, end: endSession, lock, refreshBalance, send }
}
