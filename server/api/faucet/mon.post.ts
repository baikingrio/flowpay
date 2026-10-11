import { WaitForTransactionReceiptTimeoutError } from 'viem'

import {
  cooldownKeys,
  decideDrip,
  FAUCET_HTTP_STATUS,
  formatDrip,
  RECEIPT_TIMEOUT_MS,
  validateRecipient,
  type FaucetErrorCode,
} from '../../../shared/faucet'
import { faucetCooldown, getFaucetRuntime, logFaucetError, runExclusive } from '../../utils/faucet'

/**
 * POST /api/faucet/mon { address } → { hash, amount, status } | { error }
 * Drips a little testnet MON so a brand-new account can pay gas.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'no-store')
  const fail = (code: FaucetErrorCode) => {
    setResponseStatus(event, FAUCET_HTTP_STATUS[code])
    return { error: code }
  }

  const faucet = getFaucetRuntime()
  if (!faucet)
    return fail('faucet_unconfigured')

  const body = await readBody<{ address?: unknown } | null>(event).catch(() => null)
  const recipient = validateRecipient(body?.address, faucet.account.address)
  if (!recipient.ok)
    return fail('invalid_address')

  const ip = getRequestIP(event, { xForwardedFor: true })
  const keys = cooldownKeys(recipient.address, ip)
  const now = Date.now()
  if (!faucetCooldown.isFree(keys, now))
    return fail('cooldown')
  faucetCooldown.mark(keys, now)

  let hash: `0x${string}` | undefined
  try {
    const outcome = await runExclusive(async () => {
      const [recipientBalance, faucetBalance] = await Promise.all([
        faucet.publicClient.getBalance({ address: recipient.address }),
        faucet.publicClient.getBalance({ address: faucet.account.address }),
      ])
      const refusal = decideDrip({ recipientBalance, faucetBalance, amount: faucet.amount })
      if (refusal)
        return { refusal }
      const sent = await faucet.walletClient.sendTransaction({
        account: faucet.account,
        chain: faucet.walletClient.chain,
        to: recipient.address,
        value: faucet.amount,
      })
      return { hash: sent }
    })
    if ('refusal' in outcome && outcome.refusal) {
      faucetCooldown.release(keys)
      return fail(outcome.refusal)
    }
    hash = (outcome as { hash: `0x${string}` }).hash
  }
  catch (error) {
    faucetCooldown.release(keys)
    logFaucetError('send', error)
    return fail('send_failed')
  }

  const amount = formatDrip(faucet.amount)
  try {
    const receipt = await faucet.publicClient.waitForTransactionReceipt({ hash, timeout: RECEIPT_TIMEOUT_MS })
    if (receipt.status !== 'success')
      return fail('send_failed')
    return { hash, amount, status: 'confirmed' as const }
  }
  catch (error) {
    if (!(error instanceof WaitForTransactionReceiptTimeoutError))
      logFaucetError('receipt', error)
    // Broadcast went out; the client keeps polling balances.
    return { hash, amount, status: 'pending' as const }
  }
})
