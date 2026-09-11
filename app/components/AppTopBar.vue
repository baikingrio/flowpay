<script setup lang="ts">
import { Settings } from '@lucide/vue'

const { t } = useI18n()
const account = useAccountStore()
const now = ref(Date.now())

let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tick = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})
onBeforeUnmount(() => {
  if (tick)
    clearInterval(tick)
})

const remaining = computed(() => {
  if (!account.expiresAt)
    return undefined
  const ms = account.expiresAt - now.value
  if (ms <= 0)
    return 0
  return Math.ceil(ms / 1000)
})

const sessionStatus = computed(() => {
  if (account.sessionExpired)
    return 'expired'
  if (remaining.value !== undefined)
    return remaining.value === 0 ? 'expired' : 'active'
  return undefined
})
</script>

<template>
  <header class="flex items-center justify-between px-5 pt-5 pb-2">
    <p class="text-[12px] leading-[1.33] text-[#737373]">
      <template v-if="sessionStatus === 'expired'">
        {{ t('sessionExpired') }}
      </template>
      <template v-else-if="sessionStatus === 'active'">
        {{ t('sessionLeft', { seconds: remaining }) }}
      </template>
    </p>
    <NuxtLink
      to="/settings"
      class="flex h-10 w-10 items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white text-[#737373] transition-colors hover:text-[#0a0a0a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
      :aria-label="t('navSettings')"
    >
      <Settings class="size-5" :stroke-width="1.75" />
    </NuxtLink>
  </header>
</template>
