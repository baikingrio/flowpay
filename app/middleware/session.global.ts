import { readAppAuth } from '~/lib/app-auth'
import { readBoundAddress } from '~/lib/bound-address'
import { stashPendingPayUri } from '~/lib/pending-pay-uri'

export default defineNuxtRouteMiddleware((to) => {
  // App auth lives in localStorage — skip on SSR to avoid hydrate/redirect fights.
  if (import.meta.server)
    return

  const appAuth = readAppAuth()
  const boundAddress = readBoundAddress()
  const appRoutes = new Set(['/home', '/pay', '/swap', '/checkout'])
  const uri = typeof to.query.uri === 'string' ? to.query.uri : undefined

  if (!appAuth && to.path !== '/' && !to.path.startsWith('/_nuxt')) {
    return navigateTo({
      path: '/',
      query: uri ? { uri } : {},
    })
  }

  if (appAuth && !boundAddress && to.path !== '/bind' && to.path !== '/' && !to.path.startsWith('/_nuxt')) {
    return navigateTo({
      path: '/bind',
      query: uri ? { uri } : {},
    })
  }

  if (to.path === '/' && appAuth && boundAddress) {
    return navigateTo({
      path: '/home',
      query: uri ? { uri } : {},
    })
  }

  if (to.path === '/' && appAuth && !boundAddress) {
    return navigateTo({
      path: '/bind',
      query: uri ? { uri } : {},
    })
  }

  if (appRoutes.has(to.path)) {
    if (!appAuth || !boundAddress) {
      if (uri)
        stashPendingPayUri(uri)
      return navigateTo({
        path: '/',
        query: uri ? { uri } : {},
      })
    }
  }
})
