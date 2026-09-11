<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { FAUCET_URL } from '~/lib/chain'
import { shortAddress } from '~/lib/format'

const { t, locale, setLocale } = useI18n()
const account = useAccountStore()
const { lock: lockSession, signOut } = useSigningSession()
const router = useRouter()
const now = ref(Date.now())
const showClearConfirm = ref(false)
const copiedAddress = ref(false)

definePageMeta({
  layout: 'shell',
})

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

const explorerBase = 'https://testnet.monadexplorer.com'

async function copyAddress() {
  if (!account.address)
    return
  await navigator.clipboard.writeText(account.address)
  copiedAddress.value = true
  window.setTimeout(() => {
    copiedAddress.value = false
  }, 1500)
}

function toggleLocale() {
  setLocale(locale.value === 'zh-CN' ? 'en' : 'zh-CN')
}

function handleLock() {
  lockSession()
  void router.replace('/')
}

function handleClearLocal() {
  signOut()
  showClearConfirm.value = false
  void router.replace('/')
}

</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-[28px] leading-[1.14] font-semibold tracking-[-0.025em]">
      {{ t('settings') }}
    </h1>

    <!-- Account Section -->
    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="text-[18px] leading-[1.56] font-medium">
        {{ t('settingsAccount') }}
      </h2>
      <div class="mt-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-[14px] leading-[1.43] text-[#737373]">{{ t('accountAddress') }}</span>
        </div>
        <div class="flex items-center justify-between gap-3">
          <span class="font-mono text-[14px] leading-[1.43]">
            {{ account.address ? shortAddress(account.address) : '—' }}
          </span>
          <Button
            v-if="account.address"
            variant="outline"
            size="sm"
            class="shrink-0 border-[#e5e5e5] bg-white shadow-none"
            @click="copyAddress"
          >
            {{ copiedAddress ? t('copied') : t('copy') }}
          </Button>
        </div>
        <p class="mt-1 text-[13px] leading-[1.4] text-[#737373]">
          {{ t('accountPasskeyNote') }}
        </p>
      </div>
    </section>

    <!-- Session Section -->
    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="text-[18px] leading-[1.56] font-medium">
        {{ t('settingsSession') }}
      </h2>
      <div class="mt-4 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <span class="text-[14px] leading-[1.43] text-[#737373]">{{ t('sessionRemaining') }}</span>
          <span class="text-[14px] leading-[1.43] font-medium tabular-nums">
            <template v-if="remaining !== undefined && remaining > 0">
              {{ Math.floor(remaining / 60) }}:{{ String(remaining % 60).padStart(2, '0') }}
            </template>
            <template v-else>
              {{ t('sessionExpired') }}
            </template>
          </span>
        </div>

        <div class="border-t border-[#e5e5e5] pt-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-[14px] leading-[1.43] font-medium">
                {{ t('sessionLockAction') }}
              </p>
              <p class="mt-1 text-[13px] leading-[1.4] text-[#737373]">
                {{ t('sessionLockDescription') }}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="shrink-0 border-[#e5e5e5] bg-white shadow-none"
              @click="handleLock"
            >
              {{ t('sessionLockAction') }}
            </Button>
          </div>
        </div>

        <div v-if="!showClearConfirm" class="border-t border-[#e5e5e5] pt-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-[14px] leading-[1.43] font-medium">
                {{ t('clearLocal') }}
              </p>
              <p class="mt-1 text-[13px] leading-[1.4] text-[#737373]">
                {{ t('clearLocalConfirm') }}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="shrink-0 border-[#e5e5e5] bg-white text-[#e7000b] shadow-none hover:bg-[#fef2f2]"
              @click="showClearConfirm = true"
            >
              {{ t('clearLocal') }}
            </Button>
          </div>
        </div>

        <div v-else class="rounded-[18px] border border-[#e5e5e5] bg-[#fef2f2] p-4">
          <p class="text-[14px] leading-[1.43] text-[#0a0a0a]">
            {{ t('clearLocalConfirm') }}
          </p>
          <div class="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              class="flex-1 border-[#e5e5e5] bg-white shadow-none"
              @click="showClearConfirm = false"
            >
              {{ t('clearCancel') }}
            </Button>
            <Button
              size="sm"
              class="flex-1 bg-[#e7000b] hover:bg-[#c30000]"
              @click="handleClearLocal"
            >
              {{ t('clearButton') }}
            </Button>
          </div>
        </div>
      </div>
    </section>

    <!-- Preferences Section -->
    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="text-[18px] leading-[1.56] font-medium">
        {{ t('settingsPreferences') }}
      </h2>
      <div class="mt-4 flex items-center justify-between">
        <span class="text-[14px] leading-[1.43] text-[#737373]">{{ t('preferencesLanguage') }}</span>
        <Button
          variant="outline"
          size="sm"
          class="border-[#e5e5e5] bg-white shadow-none"
          @click="toggleLocale"
        >
          {{ locale === 'zh-CN' ? 'English' : '中文' }}
        </Button>
      </div>
    </section>

    <!-- Network Section -->
    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="text-[18px] leading-[1.56] font-medium">
        {{ t('settingsNetwork') }}
      </h2>
      <div class="mt-4 flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-[14px] leading-[1.43]">{{ t('networkName') }}</span>
        </div>
        <div class="flex flex-col gap-2">
          <NuxtLink
            class="flex h-10 items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white text-[14px] font-medium hover:bg-[#fafafa]"
            :to="FAUCET_URL"
            external
          >
            {{ t('faucet') }}
          </NuxtLink>
          <NuxtLink
            class="flex h-10 items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white text-[14px] font-medium hover:bg-[#fafafa]"
            :to="explorerBase"
            external
          >
            {{ t('networkExplorer') }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <!-- About Section -->
    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="text-[18px] leading-[1.56] font-medium">
        {{ t('settingsAbout') }}
      </h2>
      <div class="mt-4 flex flex-col gap-3">
        <p class="text-[14px] leading-[1.43] text-[#737373]">
          {{ t('aboutProduct') }}
        </p>
      </div>
    </section>
  </div>
</template>
