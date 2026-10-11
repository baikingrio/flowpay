<script setup lang="ts">
import { shortTxHash } from '~/lib/activity'
import { FAUCET_URL } from '~/lib/chain'

/** Result line for the in-app MON drip: success (+tx link), or translated error (+external faucet fallback). */
const { t } = useI18n()
const { hash, pending, amount, error, errorKey, externalFallback } = useMonFaucet()
</script>

<template>
  <p v-if="hash" class="text-[13px] leading-[1.4] text-[#16a34a]" role="status">
    <span class="font-medium">{{ pending ? t('monClaimPending', { amount }) : t('faucetClaimedAmount', { amount, token: 'MON' }) }}</span> ·
    <NuxtLink class="underline" :to="`https://testnet.monadexplorer.com/tx/${hash}`" external>
      {{ shortTxHash(hash) }}
    </NuxtLink>
  </p>
  <p
    v-else-if="errorKey"
    class="text-[13px] leading-[1.4]"
    :class="error === 'has_balance' ? 'text-[#737373]' : 'text-[#b91c1c]'"
    role="status"
  >
    {{ t(errorKey) }}<template v-if="externalFallback">
      · <NuxtLink class="underline" :to="FAUCET_URL" external>{{ t('monExternalFaucet') }}</NuxtLink>
    </template>
  </p>
</template>
