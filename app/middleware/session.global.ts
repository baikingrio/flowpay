import { readBoundAddress } from '~/lib/bound-address'
import { stashPendingPayUri } from '~/lib/pending-pay-uri'

export default defineNuxtRouteMiddleware((to) => {
  // Bound address lives in localStorage — skip on SSR to avoid hydrate/redirect fights.
  if (import.meta.server)
    return

  const boundAddress = readBoundAddress()
  const appRoutes = new Set(['/home', '/pay', '/swap', '/checkout', '/settings'])
  const uri = typeof to.query.uri === 'string' ? to.query.uri : undefined

  // Redirect to landing if trying to access app routes without bound address
  if (appRoutes.has(to.path) && !boundAddress) {
    if (uri)
      stashPendingPayUri(uri)
    return navigateTo({
      path: '/',
      query: uri ? { uri } : {},
    })
  }

  // Redirect to home if already has bound address and visiting landing
  if (to.path === '/' && boundAddress) {
    return navigateTo({
      path: '/home',
      query: uri ? { uri } : {},
    })
  }
})
