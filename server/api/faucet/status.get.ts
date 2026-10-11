import { formatDrip, hasFunds } from '../../../shared/faucet'
import { getFaucetRuntime, logFaucetError } from '../../utils/faucet'

/**
 * GET /api/faucet/status → { configured, address, amount, funded }
 * `funded` is null when the balance could not be read. Never exposes key material.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'Cache-Control', 'public, max-age=0, s-maxage=15')
  const faucet = getFaucetRuntime()
  if (!faucet)
    return { configured: false, address: null, amount: null, funded: false }

  let funded: boolean | null = null
  try {
    const balance = await faucet.publicClient.getBalance({ address: faucet.account.address })
    funded = hasFunds(balance, faucet.amount)
  }
  catch (error) {
    logFaucetError('status', error)
  }
  return {
    configured: true,
    address: faucet.account.address,
    amount: formatDrip(faucet.amount),
    funded,
  }
})
