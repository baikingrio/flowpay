<script setup lang="ts">
import { FAUCET_URL } from '~/lib/chain'

/** One-line variant for tight spots (pay page status line). */
defineProps<{ prefix?: string }>()
const { t } = useI18n()
const { claiming, hash, pending, amount, errorKey, externalFallback, available, claim, loadStatus } = useMonFaucet()

onMounted(() => {
  void loadStatus()
})
</script>

<template>
  <span v-if="hash" class="text-[#16a34a]">{{ pending ? t('monClaimPending', { amount }) : t('faucetClaimedAmount', { amount, token: 'MON' }) }}</span>
  <span v-else-if="errorKey">
    {{ t(errorKey) }}<template v-if="externalFallback">
      · <NuxtLink class="underline" :to="FAUCET_URL" external>{{ t('monExternalFaucet') }}</NuxtLink>
    </template>
  </span>
  <span v-else>
    {{ prefix }}<NuxtLink v-if="!available" class="underline" :to="FAUCET_URL" external>{{ t('faucet') }}</NuxtLink><button
      v-else
      type="button"
      class="font-medium text-[#0a0a0a] underline disabled:opacity-60"
      :disabled="claiming"
      @click="claim"
    >{{ claiming ? t('faucetClaiming') : t('monClaim') }}</button>
  </span>
</template>
