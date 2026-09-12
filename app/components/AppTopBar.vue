<script setup lang="ts">
import { Settings } from '@lucide/vue'
import { readAppAuth } from '~/lib/app-auth'

const { t } = useI18n()
const account = useAccountStore()

const appAuth = ref(readAppAuth())

onMounted(() => {
  appAuth.value = readAppAuth()
})
</script>

<template>
  <header class="flex items-center justify-between px-5 pt-5 pb-2">
    <div class="flex items-center gap-2">
      <p v-if="appAuth" class="text-[12px] leading-[1.33] text-[#737373]">
        {{ t('githubMockLoggedIn') }} · {{ t('githubUser', { login: appAuth.login }) }}
      </p>
      <p v-else-if="account.sessionExpired" class="text-[12px] leading-[1.33] text-[#737373]">
        {{ t('sessionExpired') }}
      </p>
    </div>
    <NuxtLink
      to="/settings"
      class="flex h-10 w-10 items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white text-[#737373] transition-colors hover:text-[#0a0a0a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
      :aria-label="t('navSettings')"
    >
      <Settings class="size-5" :stroke-width="1.75" />
    </NuxtLink>
  </header>
</template>
