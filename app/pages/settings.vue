<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { readAppAuth, clearAppAuth } from '~/lib/app-auth'
import { clearBoundAddress } from '~/lib/bound-address'
import { FAUCET_URL } from '~/lib/chain'
import { shortAddress } from '~/lib/format'
import { IS_MOCK_USDC } from '~/lib/tokens'
import { shortTxHash } from '~/lib/activity'

const { t, locale, setLocale } = useI18n()
const account = useAccountStore()
const { signOut, claimTestUsdc } = useSigningSession()
const router = useRouter()
const showClearConfirm = ref(false)
const copiedAddress = ref(false)
const appAuth = ref<ReturnType<typeof readAppAuth>>()
const claimingUsdc = ref(false)
const claimUsdcHash = ref<`0x${string}` | undefined>(undefined)

async function onClaimUsdc() {
  if (claimingUsdc.value || !account.address)
    return
  claimingUsdc.value = true
  claimUsdcHash.value = undefined
  try {
    const hash = await claimTestUsdc()
    if (hash)
      claimUsdcHash.value = hash
  }
  finally {
    claimingUsdc.value = false
  }
}

definePageMeta({
  layout: 'shell',
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

function handleClearLocal() {
  signOut()
  showClearConfirm.value = false
  void router.replace('/')
}

function handleGithubMockLogout() {
  signOut()
  clearAppAuth()
  clearBoundAddress()
  void router.replace('/')
}

onMounted(() => {
  appAuth.value = readAppAuth()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-[28px] leading-[1.14] font-semibold tracking-[-0.025em]">
      {{ t('settings') }}
    </h1>

    <!-- GitHub Mock Auth Section -->
    <section v-if="appAuth" class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="text-[18px] leading-[1.56] font-medium">
        {{ t('githubMockLoggedIn') }}
      </h2>
      <div class="mt-4 flex flex-col gap-4">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3">
            <div v-if="appAuth.avatarUrl" class="size-10 overflow-hidden rounded-full border border-[#e5e5e5] bg-[#fafafa]">
              <img
                :src="appAuth.avatarUrl"
                :alt="appAuth.name"
                class="size-full object-cover"
              >
            </div>
            <div v-else class="flex size-10 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fafafa] text-[14px] font-medium text-[#737373]">
              {{ appAuth.name[0]?.toUpperCase() || '?' }}
            </div>
            <div class="flex flex-col">
              <span class="text-[14px] leading-[1.43] font-medium">{{ appAuth.name }}</span>
              <span class="text-[13px] leading-[1.4] text-[#737373]">@{{ appAuth.login }}</span>
            </div>
          </div>
        </div>
        <p class="text-[13px] leading-[1.4] text-[#e7000b]">
          {{ t('mockDisclaimer') }}
        </p>
        <div class="border-t border-[#e5e5e5] pt-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="text-[14px] leading-[1.43] font-medium">
                {{ t('githubMockLogout') }}
              </p>
              <p class="mt-1 text-[13px] leading-[1.4] text-[#737373]">
                {{ t('githubMockLogoutDescription') }}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              class="shrink-0 border-[#e5e5e5] bg-white shadow-none"
              @click="handleGithubMockLogout"
            >
              {{ t('githubMockLogout') }}
            </Button>
          </div>
        </div>
      </div>
    </section>

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
        <div v-if="!showClearConfirm">
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
          <Button
            v-if="IS_MOCK_USDC && account.address"
            variant="outline"
            class="h-10 w-full border-[#e5e5e5] bg-white shadow-none"
            :disabled="claimingUsdc"
            @click="onClaimUsdc"
          >
            {{ claimingUsdc ? t('faucetClaiming') : t('faucetClaimMock') }}
          </Button>
          <p v-if="claimUsdcHash" class="text-[13px] leading-[1.4] text-[#737373]">
            {{ t('faucetClaimed') }}
            <NuxtLink class="underline" :to="`${explorerBase}/tx/${claimUsdcHash}`" external>
              {{ shortTxHash(claimUsdcHash) }}
            </NuxtLink>
          </p>
          <p v-if="account.errorMessage === 'faucetClaimFailed'" class="text-[13px] leading-[1.4] text-[#b91c1c]">
            {{ t('faucetClaimFailed') }}
          </p>
          <p v-if="IS_MOCK_USDC" class="text-[13px] leading-[1.4] text-[#737373]">
            {{ t('faucetMockHint') }}
          </p>
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
