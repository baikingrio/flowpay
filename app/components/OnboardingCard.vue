<script setup lang="ts">
import { useMonFaucet } from '~/composables/useMonFaucet'
import { Check } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { shortTxHash } from '~/lib/activity'
import { IS_MOCK_USDC } from '~/lib/tokens'

/**
 * New-user setup while mUSDC is empty: Step 1 claim MON (gas, server drip, no Passkey)
 * → Step 2 claim mUSDC (on-chain, one Passkey). Step 2 unlocks once MON lands.
 */
const { t } = useI18n()
const account = useAccountStore()
const { claimTestUsdc } = useSigningSession()
const { amount: monAmount } = useMonFaucet()

const usdcClaiming = ref(false)
const usdcHash = ref<`0x${string}` | undefined>()

const hasMon = computed(() => (account.balanceWei ?? 0n) > 0n)
const needsUsdc = computed(() => IS_MOCK_USDC && Boolean(account.address) && account.usdcBase === 0n)
const visible = computed(() => needsUsdc.value || Boolean(usdcHash.value))

const usdcLabel = computed(() => {
  if (!usdcClaiming.value)
    return t('faucetClaimMock')
  if (account.status === 'opening')
    return t('payVerifying')
  if (account.status === 'confirming')
    return t('payConfirming')
  return t('faucetClaiming')
})

async function onClaimUsdc() {
  if (usdcClaiming.value || !hasMon.value)
    return
  usdcClaiming.value = true
  usdcHash.value = undefined
  try {
    const hash = await claimTestUsdc()
    if (hash) {
      usdcHash.value = hash
      navigator.vibrate?.(30)
    }
  }
  finally {
    usdcClaiming.value = false
  }
}

defineExpose({ visible })
</script>

<template>
  <section
    v-if="visible"
    class="rounded-[24px] border border-[#e5e5e5] bg-white p-4 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]"
  >
    <h2 class="text-[15px] leading-[1.4] font-medium">
      {{ t('onboardTitle') }}
    </h2>
    <p class="mt-0.5 text-[13px] leading-[1.4] text-[#737373]">
      {{ t('onboardSubtitle') }}
    </p>

    <ol class="mt-4 flex flex-col gap-4">
      <!-- Step 1: MON -->
      <li class="flex gap-3">
        <span
          class="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
          :class="hasMon ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#0a0a0a] text-[#fafafa]'"
          aria-hidden="true"
        >
          <Check v-if="hasMon" class="size-3.5" :stroke-width="2.5" />
          <template v-else>1</template>
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <p class="text-[14px] leading-[1.4] font-medium">
              {{ t('onboardStep1', { amount: monAmount }) }}
            </p>
            <p class="text-[12px] leading-[1.4] text-[#737373]">
              {{ hasMon ? t('onboardDone') : t('onboardStep1Body') }}
            </p>
          </div>
          <ClaimMonButton v-if="!hasMon" primary />
          <ClaimMonStatus />
        </div>
      </li>

      <!-- Step 2: mUSDC -->
      <li class="flex gap-3">
        <span
          class="inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold"
          :class="usdcHash ? 'bg-[#dcfce7] text-[#16a34a]' : hasMon ? 'bg-[#0a0a0a] text-[#fafafa]' : 'bg-[#f5f5f5] text-[#a3a3a3]'"
          aria-hidden="true"
        >
          <Check v-if="usdcHash" class="size-3.5" :stroke-width="2.5" />
          <template v-else>2</template>
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <div>
            <p class="text-[14px] leading-[1.4] font-medium" :class="hasMon ? '' : 'text-[#a3a3a3]'">
              {{ t('onboardStep2') }}
            </p>
            <p class="text-[12px] leading-[1.4] text-[#737373]">
              {{ usdcHash ? t('onboardDone') : hasMon ? t('onboardStep2Body') : t('onboardStep2Locked') }}
            </p>
          </div>
          <Button
            v-if="!usdcHash"
            :variant="hasMon ? 'default' : 'outline'"
            :class="hasMon
              ? 'h-10 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90'
              : 'h-10 w-full border-[#e5e5e5] bg-white shadow-none'"
            :disabled="!hasMon || usdcClaiming"
            @click="onClaimUsdc"
          >
            {{ usdcLabel }}
          </Button>
          <p v-if="usdcHash" class="text-[13px] leading-[1.4] text-[#16a34a]" role="status">
            <span class="font-medium">{{ t('faucetClaimedAmount', { amount: '100', token: 'mUSDC' }) }}</span> ·
            <NuxtLink class="underline" :to="`https://testnet.monadexplorer.com/tx/${usdcHash}`" external>
              {{ shortTxHash(usdcHash) }}
            </NuxtLink>
          </p>
          <p v-if="account.errorMessage === 'faucetClaimFailed'" class="text-[13px] leading-[1.4] text-[#b91c1c]">
            {{ t('faucetClaimFailed') }}
          </p>
        </div>
      </li>
    </ol>
  </section>
</template>
