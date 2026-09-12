import { readAppAuth } from '~/lib/app-auth'
import { readBoundAddress } from '~/lib/bound-address'
import { stashPendingPayUri } from '~/lib/pending-pay-uri'

export default defineNuxtRouteMiddleware((to) => {
  const account = useAccountStore()
  const appAuth = readAppAuth()
  const boundAddress = readBoundAddress()
  const appRoutes = new Set(['/home', '/pay', '/swap', '/checkout'])
  const uri = typeof to.query.uri === 'string' ? to.query.uri : undefined

  // No auth → force landing (except public assets)
  if (!appAuth && to.path !== '/' && !to.path.startsWith('/_nuxt')) {
    return navigateTo({
      path: '/',
      query: uri ? { uri } : {},
    })
  }

  // Auth but no bound address → force /bind
  if (appAuth && !boundAddress && to.path !== '/bind' && to.path !== '/' && !to.path.startsWith('/_nuxt')) {
    return navigateTo({
      path: '/bind',
      query: uri ? { uri } : {},
    })
  }

  // If on landing and has auth (with or without bound), may redirect to app
  if (to.path === '/' && appAuth) {
    if (boundAddress && account.hasSession) {
      return navigateTo({
        path: '/pay',
        query: uri ? { uri } : {},
      })
    }
    else if (!boundAddress) {
      return navigateTo({
        path: '/bind',
        query: uri ? { uri } : {},
      })
    }
  }

  // Legacy: app routes require address (for backwards compatibility with existing session)
  if (appRoutes.has(to.path) && !account.address) {
    if (uri)
      stashPendingPayUri(uri)
    return navigateTo({
      path: '/',
      query: uri ? { uri } : {},
    })
  }
})
