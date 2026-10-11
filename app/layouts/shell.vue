<script setup lang="ts">
const account = useAccountStore()
const route = useRoute()

/** Light background poll only where balances are the main content. */
const POLL_MS = 10_000
let pollTimer: ReturnType<typeof setInterval> | undefined

const isBalanceRoute = computed(() => route.path === '/home' || route.path.startsWith('/asset/'))

function refresh() {
  if (account.address)
    void account.refreshBalances()
}

function onVisibility() {
  if (document.visibilityState === 'visible')
    refresh()
}

function syncPoll() {
  const want = isBalanceRoute.value && document.visibilityState === 'visible'
  if (want && pollTimer === undefined)
    pollTimer = setInterval(refresh, POLL_MS)
  else if (!want && pollTimer !== undefined) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
}

function onVisibilityChange() {
  onVisibility()
  syncPoll()
}

onMounted(() => {
  refresh()
  window.addEventListener('focus', refresh)
  document.addEventListener('visibilitychange', onVisibilityChange)
  syncPoll()
})

onBeforeUnmount(() => {
  window.removeEventListener('focus', refresh)
  document.removeEventListener('visibilitychange', onVisibilityChange)
  if (pollTimer !== undefined)
    clearInterval(pollTimer)
  pollTimer = undefined
})

// Entering any page (e.g. back to home after a receive) shows fresh balances.
watch(() => route.path, () => {
  refresh()
  syncPoll()
})
watch(() => account.address, refresh)
</script>

<template>
  <div
    class="min-h-dvh bg-[#f5f5f5] pt-[env(safe-area-inset-top)] text-[#0a0a0a] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
  >
    <div class="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col">
      <main class="flex-1 px-5 pt-3 pb-24">
        <slot />
      </main>
      <AppTabBar />
    </div>
  </div>
</template>
