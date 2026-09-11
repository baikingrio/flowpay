<script setup lang="ts">
const account = useAccountStore()
const { refreshBalance } = useSigningSession()

onMounted(() => {
  if (account.hasSession)
    void refreshBalance()
})
</script>

<template>
  <div
    class="min-h-dvh bg-[#f5f5f5] pt-[env(safe-area-inset-top)] text-[#0a0a0a] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
  >
    <div class="mx-auto flex min-h-dvh w-full max-w-[min(100%,430px)] flex-col">
      <AppTopBar />
      <main class="flex-1 px-5 pt-4 pb-24">
        <slot />
      </main>
      <AppTabBar />
    </div>
  </div>
</template>
