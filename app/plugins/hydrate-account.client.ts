import { readAppAuth } from '~/lib/app-auth'
import { readBoundAddress } from '~/lib/bound-address'

export default defineNuxtPlugin(() => {
  if (!import.meta.client)
    return

  const account = useAccountStore()
  const boundAddress = readBoundAddress()
  const appAuth = readAppAuth()

  // Hydrate account store from localStorage on client mount
  if (boundAddress && appAuth) {
    account.address = boundAddress
    account.sessionExpired = false
    // hasSession stays false until open() is called
  }
})
