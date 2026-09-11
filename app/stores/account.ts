import { defineStore } from 'pinia'

import type { ActivityPayment } from '~/lib/activity'

export type AccountStatus = 'idle' | 'opening' | 'ready' | 'sending' | 'error'

export const useAccountStore = defineStore('account', {
  state: () => ({
    address: undefined as `0x${string}` | undefined,
    expiresAt: undefined as number | undefined,
    balanceWei: undefined as bigint | undefined,
    hasSession: false,
    status: 'idle' as AccountStatus,
    errorMessage: undefined as string | undefined,
    lastTxHash: undefined as `0x${string}` | undefined,
    activity: [] as ActivityPayment[],
  }),
})
