import { defineStore } from 'pinia'

import type { ActivityPayment } from '~/lib/activity'
import { readBalance } from '~/lib/ledger'
import { fetchMonUsdPrice } from '~/lib/price'
import { readUsdcBalance } from '~/lib/usdc'

export type AccountStatus = 'idle' | 'opening' | 'ready' | 'sending' | 'confirming' | 'error'

/** Shared in-flight refresh so concurrent callers (focus + mount + poll) cost one RPC round. */
let balancesInFlight: Promise<void> | undefined
let priceInFlight: Promise<void> | undefined

export const useAccountStore = defineStore('account', {
  state: () => ({
    address: undefined as `0x${string}` | undefined,
    /** Native MON balance in wei. */
    balanceWei: undefined as bigint | undefined,
    /** Payment token (mUSDC/USDC) balance in 6-decimal base units. */
    usdcBase: undefined as bigint | undefined,
    /** MON reference price in USD; undefined = unavailable (never guessed). */
    monPriceUsd: undefined as number | undefined,
    balancesUpdatedAt: 0,
    status: 'idle' as AccountStatus,
    errorMessage: undefined as string | undefined,
    lastTxHash: undefined as `0x${string}` | undefined,
    activity: [] as ActivityPayment[],
  }),
  actions: {
    /**
     * The one place balances are read from chain. Never throws.
     * `force`: after a send/claim/receive, a read that started earlier may be stale,
     * so queue a fresh one behind it instead of reusing it.
     */
    async refreshBalances(opts: { force?: boolean } = {}): Promise<void> {
      if (balancesInFlight) {
        if (!opts.force)
          return balancesInFlight
        return balancesInFlight.then(() => this.refreshBalances())
      }
      const address = this.address
      if (!address)
        return
      balancesInFlight = (async () => {
        const [mon, usdc] = await Promise.allSettled([readBalance(address), readUsdcBalance(address)])
        // Account switched / cleared while reading: drop the result.
        if (this.address !== address)
          return
        if (mon.status === 'fulfilled')
          this.balanceWei = mon.value
        if (usdc.status === 'fulfilled')
          this.usdcBase = usdc.value
        this.balancesUpdatedAt = Date.now()
      })().finally(() => {
        balancesInFlight = undefined
      })
      void this.refreshPrice()
      return balancesInFlight
    },
    /** Cached (5 min) MON reference price; keeps the last value on failure. */
    async refreshPrice(): Promise<void> {
      if (priceInFlight)
        return priceInFlight
      priceInFlight = fetchMonUsdPrice()
        .then((usd) => {
          if (usd !== undefined || this.monPriceUsd === undefined)
            this.monPriceUsd = usd
        })
        .finally(() => {
          priceInFlight = undefined
        })
      return priceInFlight
    },
    clearBalances(): void {
      this.balanceWei = undefined
      this.usdcBase = undefined
      this.balancesUpdatedAt = 0
    },
  },
})
