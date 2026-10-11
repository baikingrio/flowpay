import { readActivity } from '~/lib/activity'
import { readBoundAddress } from '~/lib/bound-address'

export default defineNuxtPlugin(() => {
  if (!import.meta.client)
    return

  const account = useAccountStore()
  const boundAddress = readBoundAddress()

  // The remembered address is the account; no biometric needed to view it.
  if (boundAddress) {
    account.address = boundAddress
    account.activity = readActivity(boundAddress)
  }
})
