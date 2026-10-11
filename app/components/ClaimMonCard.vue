<script setup lang="ts">
import { RECIPIENT_MAX_BALANCE_WEI } from '~~/shared/faucet'

/** Shown while MON is (almost) empty, or right after a claim to confirm it. */
const { t } = useI18n()
const account = useAccountStore()
const { hash, amount } = useMonFaucet()

const needsMon = computed(() =>
  Boolean(account.address) && account.balanceWei !== undefined && account.balanceWei < RECIPIENT_MAX_BALANCE_WEI,
)
// Keep the success line only where the claim was offered (not on a card that mounts later).
const wasNeeded = ref(false)
watchEffect(() => {
  if (needsMon.value)
    wasNeeded.value = true
})
</script>

<template>
  <div v-if="needsMon || (hash && wasNeeded)" class="flex flex-col gap-3 rounded-[24px] border border-dashed border-[#e5e5e5] bg-[#fafafa] p-4">
    <p v-if="needsMon" class="text-[14px] leading-[1.43] text-[#737373]">
      {{ t('monClaimHint', { amount }) }}
    </p>
    <ClaimMonButton v-if="needsMon" />
    <ClaimMonStatus />
  </div>
</template>
