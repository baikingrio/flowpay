<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { shortTxHash } from '~/lib/activity'
import { IS_MOCK_USDC } from '~/lib/tokens'

/** Shown only while mUSDC is empty (or right after a claim, to confirm it). */
const { t } = useI18n()
const account = useAccountStore()
const { claimTestUsdc } = useSigningSession()
const claiming = ref(false)
const claimHash = ref<`0x${string}` | undefined>()

const needsMockUsdc = computed(() => IS_MOCK_USDC && Boolean(account.address) && account.usdcBase === 0n)
const label = computed(() => {
  if (!claiming.value)
    return t('faucetClaimMock')
  if (account.status === 'opening')
    return t('payVerifying')
  if (account.status === 'confirming')
    return t('payConfirming')
  return t('faucetClaiming')
})

async function onClaim() {
  if (claiming.value || !account.address)
    return
  claiming.value = true
  claimHash.value = undefined
  try {
    const hash = await claimTestUsdc()
    if (hash) {
      claimHash.value = hash
      navigator.vibrate?.(30)
    }
  }
  finally {
    claiming.value = false
  }
}
</script>

<template>
  <div v-if="needsMockUsdc || claimHash" class="rounded-[24px] border border-dashed border-[#e5e5e5] bg-[#fafafa] p-4">
    <template v-if="needsMockUsdc && !claimHash">
      <p class="text-[14px] leading-[1.43] text-[#737373]">
        {{ t('homeNeedMockUsdc') }}
      </p>
      <Button
        variant="outline"
        class="mt-3 w-full border-[#e5e5e5] bg-white shadow-none"
        :disabled="claiming"
        @click="onClaim"
      >
        {{ label }}
      </Button>
    </template>
    <p v-if="claimHash" class="text-[13px] leading-[1.4] text-[#16a34a]" role="status">
      <span class="font-medium">{{ t('faucetClaimedAmount', { amount: '100', token: 'mUSDC' }) }}</span> ·
      <NuxtLink class="underline" :to="`https://testnet.monadexplorer.com/tx/${claimHash}`" external>
        {{ shortTxHash(claimHash) }}
      </NuxtLink>
    </p>
    <p v-if="account.errorMessage === 'faucetClaimFailed'" class="mt-2 text-[13px] leading-[1.4] text-[#b91c1c]">
      {{ t('faucetClaimFailed') }}
    </p>
  </div>
</template>
