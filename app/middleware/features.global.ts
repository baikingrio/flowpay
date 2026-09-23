/**
 * Feature flag route guard
 *
 * Redirects to /home when accessing routes that are disabled by feature flags
 */
export default defineNuxtRouteMiddleware((to) => {
  // Only check on client
  if (import.meta.server)
    return

  const flags = useFeatureFlags()

  // Check if swap route is accessed when flag is disabled
  if (to.path === '/swap' && !flags.swap) {
    return navigateTo('/home')
  }
})
