<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { readAppAuth } from '~/lib/app-auth'
import { writeBoundAddress } from '~/lib/bound-address'

const { t } = useI18n()
const router = useRouter()
const account = useAccountStore()
const { open } = useSigningSession()

definePageMeta({
  layout: false,
})

const appAuth = ref(readAppAuth())
const status = ref<'idle' | 'opening' | 'error'>('idle')
const errorMessage = ref<string>()

async function handleBind() {
  if (!appAuth.value)
    return
  
  status.value = 'opening'
  errorMessage.value = undefined
  
  const ok = await open()
  
  if (!ok) {
    status.value = 'error'
    errorMessage.value = account.errorMessage
    return
  }
  
  if (account.address) {
    writeBoundAddress(account.address)
    status.value = 'idle'
    await router.push('/home')
  }
  else {
    status.value = 'error'
    errorMessage.value = 'passkeyFailed'
  }
}

onMounted(() => {
  if (!appAuth.value) {
    void router.replace('/')
  }
})
</script>

<template>
  <main class="bind-page flex min-h-dvh flex-col items-center justify-center bg-[#f5f5f5] px-6 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
    <div class="w-full max-w-[min(100%,380px)]">
      <div class="rounded-[24px] border border-[#e5e5e5] bg-white p-6 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <div v-if="appAuth" class="flex flex-col items-center text-center">
          <div v-if="appAuth.avatarUrl" class="size-16 overflow-hidden rounded-full border border-[#e5e5e5] bg-[#fafafa]">
            <img
              :src="appAuth.avatarUrl"
              :alt="appAuth.name"
              class="size-full object-cover"
            >
          </div>
          <div v-else class="flex size-16 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fafafa] text-[24px] font-semibold text-[#737373]">
            {{ appAuth.name[0]?.toUpperCase() || '?' }}
          </div>

          <h1 class="mt-4 text-[24px] leading-[1.33] font-semibold tracking-[-0.025em] text-[#0a0a0a]">
            {{ t('bindTitle') }}
          </h1>

          <p class="mt-2 text-[14px] leading-[1.43] text-[#737373]">
            {{ t('bindMockUser', { name: appAuth.name, login: appAuth.login }) }}
          </p>

          <p class="mt-4 max-w-[32ch] text-[14px] leading-[1.43] text-[#737373]">
            {{ t('bindDescription') }}
          </p>

          <Button
            class="mt-6 h-11 w-full rounded-[18px] text-[14px] font-medium"
            :disabled="status === 'opening'"
            @click="handleBind"
          >
            {{ status === 'opening' ? t('opening') : t('bindContinue') }}
          </Button>

          <p
            v-if="errorMessage"
            class="mt-4 text-[14px] leading-[1.43] text-[#e7000b]"
            role="alert"
          >
            {{ t(errorMessage) }}
          </p>

          <p class="mt-6 text-[12px] leading-[1.33] text-[#737373]">
            {{ t('bindNote') }}
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.bind-page {
  background-image:
    radial-gradient(ellipse 120% 80% at 50% -20%, rgba(255, 255, 255, 0.9), transparent 55%),
    linear-gradient(180deg, #fafafa 0%, #f5f5f5 28%, #f5f5f5 100%);
}
</style>
