import { defineStore } from 'pinia'

import type { ActivityPayment } from '~/lib/activity'

export type AccountStatus = 'idle' | 'opening' | 'ready' | 'sending' | 'confirming' | 'error'

export const useAccountStore = defineStore('account', {
  state: () => ({
    address: undefined as `0x${string}` | undefined,
    balanceWei: undefined as bigint | undefined,
    status: 'idle' as AccountStatus,
    errorMessage: undefined as string | undefined,
    lastTxHash: undefined as `0x${string}` | undefined,
    activity: [] as ActivityPayment[],
  }),
})
