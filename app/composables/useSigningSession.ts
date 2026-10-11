import type { Secp256k1SigningSession } from '@category-labs/mera'

import { clearAppAuth } from '~/lib/app-auth'
import { clearBoundAddress, writeBoundAddress } from '~/lib/bound-address'
import { clearActivity, readActivity, recordPayment } from '~/lib/activity'
import { continueThenCreate, isMeraError, PasskeyCancelledError, unlockForSigning } from '~/lib/account'
import { clearStoredCredentialId, readStoredCredentialId, writeStoredCredentialId } from '~/lib/credential'
import { readBalance, sendPayment } from '~/lib/ledger'
import { clearPendingPayUri } from '~/lib/pending-pay-uri'
import type { SwapDirection } from '~/lib/swap'
import { approveUsdc, calculateMinAmountOut, getAmountOut, getRouterAddress, readUsdcAllowance, swapExactETHForTokens, swapExactTokensForETH } from '~/lib/swap'
import { claimMockUsdc, readUsdcBalance, sendUsdcTransfer } from '~/lib/usdc'
import { clearCheckoutLedger } from '~/lib/checkout-ledger'
import { useAccountStore } from '~/stores/account'

/**
 * Account model (2026-10-11): no login session.
 * - The address is remembered locally after the first Passkey create/continue.
 * - Reading balances, history and receiving (checkout) never needs biometrics.
 * - Every signing action (send, claim, swap) runs its own Passkey prompt,
 *   derives the key in memory, signs, and immediately ends the session.
 */

class PasskeyMismatchError extends Error {
  constructor() {
    super('Passkey does not match this account')
    this.name = 'PasskeyMismatchError'
  }
}

function mapError(error: unknown, fallback: string): string {
  if (error instanceof PasskeyCancelledError)
    return 'cancelled'
  if (error instanceof PasskeyMismatchError)
    return 'passkeyMismatch'
  if (isMeraError(error) && error.code === 'PRF_UNAVAILABLE')
    return 'prfUnavailable'
  return fallback
}

export function useSigningSession() {
  const account = useAccountStore()

  async function refreshBalance(): Promise<void> {
    if (account.address === undefined)
      return
    account.balanceWei = await readBalance(account.address)
  }

  /** Onboarding / recovery only: Passkey continue-or-create, then forget the key. */
  async function open(): Promise<boolean> {
    if (!import.meta.client)
      return false
    account.status = 'opening'
    account.errorMessage = undefined
    try {
      const opened = await continueThenCreate(readStoredCredentialId())
      opened.session.end()
      writeStoredCredentialId(opened.credentialId)
      writeBoundAddress(opened.address)
      account.address = opened.address
      account.activity = readActivity(opened.address)
      account.lastTxHash = undefined
      account.status = 'idle'
      void refreshBalance().catch(() => {})
      return true
    }
    catch (error) {
      account.status = 'error'
      account.errorMessage = mapError(error, 'passkeyFailed')
      return false
    }
  }

  /** One biometric prompt → sign → wipe. */
  async function withSigner<T>(fn: (session: Secp256k1SigningSession) => Promise<T>): Promise<T> {
    const opened = await unlockForSigning(readStoredCredentialId())
    try {
      if (account.address && opened.address.toLowerCase() !== account.address.toLowerCase())
        throw new PasskeyMismatchError()
      if (!account.address) {
        account.address = opened.address
        writeBoundAddress(opened.address)
      }
      writeStoredCredentialId(opened.credentialId)
      account.status = 'sending'
      return await fn(opened.session)
    }
    finally {
      opened.session.end()
    }
  }

  async function runSigned<T>(fallbackError: string, fn: (session: Secp256k1SigningSession) => Promise<T>): Promise<T | undefined> {
    account.status = 'opening'
    account.errorMessage = undefined
    try {
      const result = await withSigner(fn)
      account.status = 'idle'
      return result
    }
    catch (error) {
      account.status = 'error'
      account.errorMessage = mapError(error, fallbackError)
      return undefined
    }
  }

  async function send(to: `0x${string}`, value: bigint): Promise<void> {
    if (account.balanceWei === undefined || value <= 0n || account.balanceWei <= value)
      return
    const hash = await runSigned('sendFailed', session => sendPayment(session, to, value))
    if (!hash)
      return
    account.lastTxHash = hash
    if (account.address !== undefined) {
      account.activity = recordPayment(account.address, { hash, to, valueWei: value.toString() })
    }
    await refreshBalance().catch(() => {})
  }

  async function sendUsdc(to: `0x${string}`, amountBase: bigint): Promise<void> {
    if (account.address === undefined || amountBase <= 0n)
      return
    const usdcBalance = await readUsdcBalance(account.address)
    if (usdcBalance < amountBase) {
      account.status = 'error'
      account.errorMessage = 'insufficientUsdc'
      return
    }
    const hash = await runSigned('sendFailed', session => sendUsdcTransfer(session, to, amountBase))
    if (!hash)
      return
    account.lastTxHash = hash
    await refreshBalance().catch(() => {})
  }

  async function claimTestUsdc(): Promise<`0x${string}` | undefined> {
    const hash = await runSigned('faucetClaimFailed', session => claimMockUsdc(session))
    if (hash) {
      account.lastTxHash = hash
      await refreshBalance().catch(() => {})
    }
    return hash
  }

  async function swap(
    direction: SwapDirection,
    amountIn: bigint,
    slippagePercent = 2,
  ): Promise<`0x${string}` | undefined> {
    if (account.address === undefined)
      return undefined
    const { amount: amountOut, error: quoteError } = await getAmountOut(amountIn, direction)
    if (quoteError || amountOut === 0n) {
      account.errorMessage = quoteError === 'No liquidity' ? 'noLiquidity' : 'quoteFailed'
      account.status = 'error'
      return undefined
    }
    const amountOutMin = calculateMinAmountOut(amountOut, slippagePercent)
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 300)
    const owner = account.address
    const hash = await runSigned('swapFailed', async (session) => {
      if (direction === 'monToUsdc')
        return swapExactETHForTokens(session, amountIn, amountOutMin, deadline)
      const allowance = await readUsdcAllowance(owner, getRouterAddress())
      if (allowance < amountIn)
        await approveUsdc(session, amountIn)
      return swapExactTokensForETH(session, amountIn, amountOutMin, deadline)
    })
    if (hash) {
      account.lastTxHash = hash
      await refreshBalance().catch(() => {})
    }
    return hash
  }

  async function getUsdcBalance(): Promise<bigint> {
    if (account.address === undefined)
      return 0n
    return readUsdcBalance(account.address)
  }

  async function getSwapQuote(amountIn: bigint, direction: SwapDirection): Promise<{ amount: bigint, error?: string }> {
    return getAmountOut(amountIn, direction)
  }

  /** Forget this device's account (Passkey itself stays in the authenticator). */
  function signOut(): void {
    const addr = account.address
    if (addr !== undefined) {
      clearActivity(addr)
      clearCheckoutLedger(addr)
    }
    clearStoredCredentialId()
    clearPendingPayUri()
    clearAppAuth()
    clearBoundAddress()
    account.address = undefined
    account.balanceWei = undefined
    account.lastTxHash = undefined
    account.activity = []
    account.errorMessage = undefined
    account.status = 'idle'
  }

  return { open, signOut, refreshBalance, send, sendUsdc, claimTestUsdc, swap, getUsdcBalance, getSwapQuote }
}
