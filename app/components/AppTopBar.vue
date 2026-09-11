<script setup lang="ts">
const { t, locale, setLocale } = useI18n()
const account = useAccountStore()
const { lock: lockSession } = useSigningSession()
const router = useRouter()
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

function toggleLocale() {
  setLocale(locale.value === 'zh-CN' ? 'en' : 'zh-CN')
}

function lock() {
  lockSession()
  void router.replace('/')
}
</script>

<template>
  <header class="flex items-center justify-between px-5 pt-5 pb-2">
    <p class="text-[12px] leading-[1.33] text-[#737373]">
      <template v-if="remaining !== undefined">
        {{ t('sessionLeft', { seconds: remaining }) }}
      </template>
    </p>
    <div class="flex items-center gap-2">
      <button
        type="button"
        class="h-10 rounded-[18px] px-3 text-sm text-foreground"
        @click="toggleLocale"
      >
        {{ t('lang') }}
      </button>
      <button
        type="button"
        class="h-10 rounded-[18px] border border-[#e5e5e5] bg-white px-3 text-sm text-foreground"
        @click="lock"
      >
        {{ t('lock') }}
      </button>
    </div>
  </header>
</template>
