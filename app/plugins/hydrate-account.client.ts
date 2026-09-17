import { readBoundAddress } from '~/lib/bound-address'

export default defineNuxtPlugin(() => {
  if (!import.meta.client)
    return

  const account = useAccountStore()
  const boundAddress = readBoundAddress()

  // Hydrate account store from localStorage on client mount
  if (boundAddress) {
    account.address = boundAddress
    account.sessionExpired = false
    // hasSession stays false until open() is called
  }
})
