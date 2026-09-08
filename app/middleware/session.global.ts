import { stashPendingPayUri } from '~/lib/pending-pay-uri'

export default defineNuxtRouteMiddleware((to) => {
  const account = useAccountStore()
  const appRoutes = new Set(['/home', '/pay', '/swap'])

  if (to.path === '/' && account.hasSession)
    return navigateTo('/pay')

  if (appRoutes.has(to.path) && !account.address) {
    const uri = typeof to.query.uri === 'string' ? to.query.uri : undefined
    if (uri)
      stashPendingPayUri(uri)
    return navigateTo('/')
  }
})
