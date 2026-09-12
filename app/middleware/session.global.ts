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

  // If on landing and has auth + bound, redirect to home
  if (to.path === '/' && appAuth && boundAddress) {
    return navigateTo({
      path: '/home',
      query: uri ? { uri } : {},
    })
  }

  // If on landing and has auth but no bound, go to bind
  if (to.path === '/' && appAuth && !boundAddress) {
    return navigateTo({
      path: '/bind',
      query: uri ? { uri } : {},
    })
  }

  // App routes: allow if auth+bound (even without active session)
  if (appRoutes.has(to.path)) {
    if (!appAuth || !boundAddress) {
      if (uri)
        stashPendingPayUri(uri)
      return navigateTo({
        path: '/',
        query: uri ? { uri } : {},
      })
    }
    // auth+bound present: allow access (browsing without session is OK)
    // If they need signing, Continue button will prompt open()
  }
})
