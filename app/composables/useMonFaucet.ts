import type { FaucetErrorCode } from '~~/shared/faucet'
import { claimMon, fetchMonFaucetStatus, MON_CLAIM_ERROR_KEY, showsExternalFaucet } from '~/lib/mon-faucet'

let statusLoadedAt = 0
let statusInFlight: Promise<void> | undefined

/** In-app MON drip (server faucet). State is shared across every component that uses it. */
export function useMonFaucet() {
  const account = useAccountStore()
  const claiming = useState('monFaucet:claiming', () => false)
  const hash = useState<`0x${string}` | undefined>('monFaucet:hash', () => undefined)
  const pending = useState('monFaucet:pending', () => false)
  const error = useState<FaucetErrorCode | undefined>('monFaucet:error', () => undefined)
  /** false = server says empty/unconfigured → show the external faucet instead of the button. */
  const available = useState<boolean>('monFaucet:available', () => true)
  const amount = useState('monFaucet:amount', () => '0.05')

  async function loadStatus(): Promise<void> {
    if (statusInFlight)
      return statusInFlight
    if (Date.now() - statusLoadedAt < 30_000)
      return
    statusInFlight = fetchMonFaucetStatus().then((status) => {
      if (!status)
        return
      statusLoadedAt = Date.now()
      if (status.amount)
        amount.value = status.amount
      available.value = status.configured && status.funded !== false
      if (!available.value && !error.value)
        error.value = status.configured ? 'faucet_empty' : 'faucet_unconfigured'
    }).finally(() => {
      statusInFlight = undefined
    })
    return statusInFlight
  }

  /** Keep refreshing balances until MON shows up (pending receipts), max ~30s. */
  async function waitForMon(): Promise<void> {
    for (let i = 0; i < 15; i++) {
      await account.refreshBalances({ force: true })
      if ((account.balanceWei ?? 0n) > 0n)
        return
      await new Promise(resolve => setTimeout(resolve, 2_000))
    }
  }

  async function claim(): Promise<boolean> {
    const address = account.address
    if (claiming.value || !address)
      return false
    claiming.value = true
    error.value = undefined
    hash.value = undefined
    pending.value = false
    try {
      const result = await claimMon(address)
      if (!result.ok) {
        error.value = result.error
        if (showsExternalFaucet(result.error))
          available.value = false
        if (result.error === 'has_balance')
          void account.refreshBalances({ force: true })
        return false
      }
      hash.value = result.hash
      amount.value = result.amount
      pending.value = result.pending
      navigator.vibrate?.(30)
      await waitForMon()
      pending.value = false
      return true
    }
    finally {
      claiming.value = false
    }
  }

  const errorKey = computed(() => error.value ? MON_CLAIM_ERROR_KEY[error.value] : undefined)
  const externalFallback = computed(() => showsExternalFaucet(error.value))

  return { claiming, hash, pending, error, errorKey, externalFallback, available, amount, loadStatus, claim }
}
