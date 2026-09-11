import { stashPendingPayUri } from '~/lib/pending-pay-uri'

export default defineNuxtRouteMiddleware((to) => {
  const account = useAccountStore()
  const appRoutes = new Set(['/home', '/pay', '/swap', '/checkout'])
  const uri = typeof to.query.uri === 'string' ? to.query.uri : undefined

  if (to.path === '/' && account.hasSession) {
    return navigateTo({
      path: '/pay',
      query: uri ? { uri } : {},
    })
  }

  if (appRoutes.has(to.path) && !account.address) {
    if (uri)
      stashPendingPayUri(uri)
    return navigateTo({
      path: '/',
      query: uri ? { uri } : {},
    })
  }
})
