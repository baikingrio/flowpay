<script setup lang="ts">
import { useMonFaucet } from '~/composables/useMonFaucet'
import { Button } from '@/components/ui/button'
import { FAUCET_URL } from '~/lib/chain'

/** In-app "claim test MON" button. Falls back to the external faucet link when the server faucet is empty. */
withDefaults(defineProps<{ primary?: boolean }>(), { primary: false })
const { t } = useI18n()
const account = useAccountStore()
const { claiming, available, claim, loadStatus } = useMonFaucet()

onMounted(() => {
  void loadStatus()
})
</script>

<template>
  <NuxtLink
    v-if="!available"
    class="flex h-10 w-full items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white text-[14px] font-medium hover:bg-[#fafafa]"
    :to="FAUCET_URL"
    external
  >
    {{ t('faucet') }}
  </NuxtLink>
  <Button
    v-else-if="primary"
    class="h-10 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90"
    :disabled="claiming || !account.address"
    @click="claim"
  >
    {{ claiming ? t('faucetClaiming') : t('monClaim') }}
  </Button>
  <Button
    v-else
    variant="outline"
    class="h-10 w-full border-[#e5e5e5] bg-white shadow-none"
    :disabled="claiming || !account.address"
    @click="claim"
  >
    {{ claiming ? t('faucetClaiming') : t('monClaim') }}
  </Button>
</template>
