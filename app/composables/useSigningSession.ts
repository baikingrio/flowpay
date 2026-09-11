import type { Secp256k1SigningSession } from '@category-labs/mera'

import { clearActivity, readActivity, recordPayment } from '~/lib/activity'
import { continueThenCreate, isMeraError, PasskeyCancelledError } from '~/lib/account'
import { clearStoredCredentialId, readStoredCredentialId, writeStoredCredentialId } from '~/lib/credential'
import { readBalance, sendPayment } from '~/lib/ledger'
import { clearPendingPayUri } from '~/lib/pending-pay-uri'
import type { SwapDirection } from '~/lib/swap'
import { approveUsdc, calculateMinAmountOut, getAmountOut, getRouterAddress, readUsdcAllowance, readUsdcBalance, swapExactETHForTokens, swapExactTokensForETH } from '~/lib/swap'
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

  async function swap(
    direction: SwapDirection,
    amountIn: bigint,
    slippagePercent = 2,
  ): Promise<`0x${string}` | undefined> {
    if (session === undefined || account.address === undefined)
      return undefined
    account.status = 'sending'
    account.errorMessage = undefined
    try {
      const { amount: amountOut, error: quoteError } = await getAmountOut(amountIn, direction)
      if (quoteError || amountOut === 0n) {
        account.errorMessage = quoteError === 'No liquidity' ? 'noLiquidity' : 'quoteFailed'
        account.status = 'error'
        return undefined
      }

      const amountOutMin = calculateMinAmountOut(amountOut, slippagePercent)
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)

      let hash: `0x${string}`

      if (direction === 'monToUsdc') {
        hash = await swapExactETHForTokens(session, amountIn, amountOutMin, deadline)
      }
      else {
        const allowance = await readUsdcAllowance(account.address, getRouterAddress())
        if (allowance < amountIn)
          await approveUsdc(session, amountIn)

        hash = await swapExactTokensForETH(session, amountIn, amountOutMin, deadline)
      }

      account.lastTxHash = hash
      await refreshBalance()
      account.status = 'ready'
      return hash
    }
    catch (error) {
      account.status = 'error'
      account.errorMessage = 'swapFailed'
      account.hasSession = session !== undefined
      return undefined
    }
  }

  async function getUsdcBalance(): Promise<bigint> {
    if (account.address === undefined)
      return 0n
    return readUsdcBalance(account.address)
  }

  async function getSwapQuote(amountIn: bigint, direction: SwapDirection): Promise<{ amount: bigint, error?: string }> {
    return getAmountOut(amountIn, direction)
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

  function signOut(): void {
    const addr = account.address
    if (addr !== undefined) {
      clearActivity(addr)
    }
    clearStoredCredentialId()
    clearPendingPayUri()
    lock()
  }

  return { open, end: endSession, lock, signOut, refreshBalance, send, swap, getUsdcBalance, getSwapQuote }
}
