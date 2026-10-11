<script setup lang="ts">
import { Copy, Check } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { FAUCET_URL } from '~/lib/chain'
import { shortTxHash } from '~/lib/activity'
import { shortAddress } from '~/lib/format'
import { formatMon } from '~/lib/ledger'
import { IS_MOCK_USDC } from '~/lib/tokens'
import { formatUsdcFromBase } from '~/lib/usdc-amount'
import { readUsdcBalance } from '~/lib/usdc'

const { t } = useI18n()
const account = useAccountStore()
const { claimTestUsdc } = useSigningSession()
const copied = ref(false)
const showReceive = ref(false)
const usdcBalance = ref<bigint | undefined>(undefined)
const claimingUsdc = ref(false)
const claimUsdcHash = ref<`0x${string}` | undefined>(undefined)

definePageMeta({
  layout: 'shell',
})

const explorerBase = 'https://testnet.monadexplorer.com/tx/'

const needsMockUsdc = computed(() =>
  IS_MOCK_USDC
  && account.address
  && (usdcBalance.value === undefined || usdcBalance.value === 0n),
)

async function copyAddress() {
  if (!account.address)
    return
  await navigator.clipboard.writeText(account.address)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1500)
}

async function refreshUsdc() {
  if (!account.address) {
    usdcBalance.value = undefined
    return
  }
  try {
    usdcBalance.value = await readUsdcBalance(account.address)
  }
  catch {
    usdcBalance.value = undefined
  }
}

async function onClaimUsdc() {
  if (claimingUsdc.value || !account.address)
    return
  claimingUsdc.value = true
  claimUsdcHash.value = undefined
  try {
    const hash = await claimTestUsdc()
    if (hash) {
      claimUsdcHash.value = hash
      await refreshUsdc()
    }
  }
  finally {
    claimingUsdc.value = false
  }
}

onMounted(() => {
  void refreshUsdc()
})

watch(() => account.address, () => {
  void refreshUsdc()
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- Balance card -->
    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <p class="text-[13px] leading-[1.4] text-[#737373]">
        {{ t('homeBalance') }}
      </p>
      <p class="mt-2 text-[36px] leading-[1.11] font-semibold tracking-[-0.025em] tabular-nums">
        <template v-if="account.balanceWei === undefined">
          —
        </template>
        <template v-else>
          {{ formatMon(account.balanceWei) }}
          <span class="text-[16px] font-medium tracking-normal text-[#737373]">MON</span>
        </template>
      </p>
      <p class="mt-1 text-[20px] font-medium tabular-nums text-[#0a0a0a]">
        <template v-if="usdcBalance === undefined">
          —
        </template>
        <template v-else>
          {{ formatUsdcFromBase(usdcBalance) }}
          <span class="text-[14px] font-medium text-[#737373]">{{ IS_MOCK_USDC ? 'mUSDC' : 'USDC' }}</span>
        </template>
      </p>

      <div
        v-if="account.address"
        class="mt-4 flex items-center gap-1.5 text-[14px] leading-[1.43] text-[#737373]"
      >
        <span class="font-mono tabular-nums">{{ shortAddress(account.address) }}</span>
        <button
          type="button"
          class="inline-flex size-7 items-center justify-center rounded-lg text-[#737373] transition-colors hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"
          :aria-label="copied ? t('copied') : t('copy')"
          @click="copyAddress"
        >
          <Check v-if="copied" class="size-3.5" :stroke-width="2" />
          <Copy v-else class="size-3.5" :stroke-width="1.75" />
        </button>
      </div>
    </section>

    <!-- Quick actions -->
    <div class="grid grid-cols-2 gap-2">
      <Button
        class="h-11 w-full"
        :aria-expanded="showReceive"
        @click="showReceive = !showReceive"
      >
        {{ showReceive ? t('hideReceive') : t('receive') }}
      </Button>
      <NuxtLink
        class="flex h-11 items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white text-[14px] font-medium text-[#0a0a0a] hover:bg-[#fafafa]"
        to="/pay"
      >
        {{ t('homeGoPay') }}
      </NuxtLink>
    </div>

    <PayReceivePanel
      v-if="showReceive && account.address"
      :address="account.address"
    />

    <!-- Only nudge claim when mUSDC empty -->
    <div v-if="needsMockUsdc" class="rounded-[24px] border border-dashed border-[#e5e5e5] bg-[#fafafa] p-4">
      <p class="text-[14px] leading-[1.43] text-[#737373]">
        {{ t('homeNeedMockUsdc') }}
      </p>
      <Button
        variant="outline"
        class="mt-3 w-full border-[#e5e5e5] bg-white shadow-none"
        :disabled="claimingUsdc"
        @click="onClaimUsdc"
      >
        {{ claimingUsdc ? t('faucetClaiming') : t('faucetClaimMock') }}
      </Button>
      <p v-if="claimUsdcHash" class="mt-2 text-[13px] leading-[1.4] text-[#737373]">
        {{ t('faucetClaimed') }}
        <NuxtLink class="underline" :to="`${explorerBase}${claimUsdcHash}`" external>
          {{ shortTxHash(claimUsdcHash) }}
        </NuxtLink>
      </p>
      <p v-if="account.errorMessage === 'faucetClaimFailed'" class="mt-2 text-[13px] leading-[1.4] text-[#b91c1c]">
        {{ t('faucetClaimFailed') }}
      </p>
    </div>

    <p v-if="account.balanceWei === 0n" class="text-[14px] leading-[1.43] text-[#737373]">
      {{ t('faucetNeed') }}
      <NuxtLink class="underline" :to="FAUCET_URL" external>
        {{ t('faucet') }}
      </NuxtLink>
    </p>

    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="text-[18px] leading-[1.56] font-medium">
        {{ t('history') }}
      </h2>
      <p class="mt-1 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('historyLocal') }}
      </p>

      <ul v-if="account.activity.length > 0" class="mt-4 flex flex-col gap-3">
        <li
          v-for="item in account.activity"
          :key="item.hash"
          class="flex items-start justify-between gap-3 text-[14px] leading-[1.43]"
        >
          <div class="min-w-0">
            <p class="font-medium tabular-nums text-[#0a0a0a]">
              −{{ formatMon(BigInt(item.valueWei)) }} MON
            </p>
            <p class="mt-0.5 truncate text-[#737373]">
              {{ t('payTo') }} {{ shortAddress(item.to) }}
            </p>
          </div>
          <NuxtLink
            class="shrink-0 underline"
            :to="`${explorerBase}${item.hash}`"
            external
          >
            {{ shortTxHash(item.hash) }}
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="mt-4 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('historyEmpty') }}
      </p>
    </section>
  </div>
</template>
