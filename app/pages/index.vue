<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { stashPendingPayUri } from '~/lib/pending-pay-uri'

const { t, locale, setLocale } = useI18n()
const route = useRoute()
const account = useAccountStore()
const { open } = useSigningSession()

definePageMeta({
  layout: false,
})

async function onStart() {
  stashQueryUri()
  const ok = await open()
  if (!ok)
    return
  await navigateTo('/pay')
}

function stashQueryUri() {
  const uri = typeof route.query.uri === 'string' ? route.query.uri : undefined
  if (uri)
    stashPendingPayUri(uri)
}

function toggleLocale() {
  setLocale(locale.value === 'zh-CN' ? 'en' : 'zh-CN')
}

onMounted(stashQueryUri)
</script>

<template>
  <main class="relative flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-foreground">
    <button
      type="button"
      class="absolute top-6 right-6 h-10 rounded-[18px] px-3 text-[14px] text-[#737373]"
      @click="toggleLocale"
    >
      {{ t('lang') }}
    </button>

    <div class="flex w-full max-w-[390px] flex-col items-center text-center">
      <h1 class="text-[48px] leading-[1.1] font-semibold tracking-[-0.05em]">
        Flowpay
      </h1>
      <p class="mt-4 max-w-[28ch] text-[16px] leading-[1.5] text-[#737373]">
        {{ t('tagline') }}
      </p>

      <Button
        class="mt-10 h-11 w-full max-w-xs text-[14px] font-medium"
        :disabled="account.status === 'opening'"
        @click="onStart"
      >
        {{ account.status === 'opening' ? t('opening') : t('start') }}
      </Button>

      <p class="mt-4 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('hint') }}
      </p>
      <p v-if="account.errorMessage" class="mt-3 max-w-sm text-[14px] leading-[1.43] text-[#e7000b]">
        {{ t(account.errorMessage) }}
      </p>
    </div>
  </main>
</template>
