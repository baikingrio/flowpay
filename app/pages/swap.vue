<script setup lang="ts">
import { ArrowDownUp } from '@lucide/vue'
import { formatUnits, parseUnits } from 'viem'
import { Button } from '@/components/ui/button'
import type { SwapDirection } from '~/lib/swap'

const { t } = useI18n()
const account = useAccountStore()
const { open, swap, getUsdcBalance, getSwapQuote } = useSigningSession()

definePageMeta({
  layout: 'shell',
})

const direction = ref<SwapDirection>('monToUsdc')
const amountIn = ref('')
const amountOut = ref('')
const usdcBalance = ref(0n)
const isQuoting = ref(false)
const localError = ref<string | undefined>()

const explorerHref = computed(() =>
  account.lastTxHash
    ? `https://testnet.monadexplorer.com/tx/${account.lastTxHash}`
    : undefined,
)

const parsedAmountIn = computed(() => {
  if (!amountIn.value)
    return undefined
  try {
    const decimals = direction.value === 'monToUsdc' ? 18 : 6
    const value = parseUnits(amountIn.value, decimals)
    return value > 0n ? value : undefined
  }
  catch {
    return undefined
  }
})

const fromToken = computed(() => direction.value === 'monToUsdc' ? 'MON' : 'USDC')
const toToken = computed(() => direction.value === 'monToUsdc' ? 'USDC' : 'MON')

const fromBalance = computed(() => {
  if (direction.value === 'monToUsdc')
    return account.balanceWei ?? 0n
  return usdcBalance.value
})

const fromBalanceFormatted = computed(() => {
  const decimals = direction.value === 'monToUsdc' ? 18 : 6
  return formatUnits(fromBalance.value, decimals)
})

const insufficient = computed(() =>
  parsedAmountIn.value !== undefined
  && fromBalance.value !== undefined
  && fromBalance.value < parsedAmountIn.value,
)

const canSwap = computed(() =>
  account.hasSession
  && parsedAmountIn.value !== undefined
  && parsedAmountIn.value > 0n
  && !insufficient.value
  && amountOut.value !== '',
)

async function updateQuote() {
  if (!parsedAmountIn.value || parsedAmountIn.value === 0n) {
    amountOut.value = ''
    localError.value = undefined
    return
  }
  isQuoting.value = true
  localError.value = undefined
  try {
    const { amount: quote, error: quoteError } = await getSwapQuote(parsedAmountIn.value, direction.value)
    if (quoteError) {
      localError.value = quoteError === 'No liquidity' ? 'noLiquidity' : 'quoteFailed'
      amountOut.value = ''
    }
    else {
      const decimals = direction.value === 'monToUsdc' ? 6 : 18
      amountOut.value = formatUnits(quote, decimals)
    }
  }
  catch {
    amountOut.value = ''
    localError.value = 'quoteFailed'
  }
  finally {
    isQuoting.value = false
  }
}

function toggleDirection() {
  direction.value = direction.value === 'monToUsdc' ? 'usdcToMon' : 'monToUsdc'
  // Clear amounts and let user enter fresh values
  amountIn.value = ''
  amountOut.value = ''
  localError.value = undefined
}

async function onSwap() {
  localError.value = undefined
  if (!account.hasSession) {
    await open()
    return
  }
  if (!parsedAmountIn.value) {
    localError.value = 'invalidAmount'
    return
  }
  if (insufficient.value) {
    localError.value = 'insufficient'
    return
  }
  const hash = await swap(direction.value, parsedAmountIn.value)
  if (hash)
    await loadBalances()
}

async function loadBalances() {
  if (!account.address)
    return
  usdcBalance.value = await getUsdcBalance()
}

watch(amountIn, () => {
  void updateQuote()
})

onMounted(() => {
  void loadBalances()
})
</script>

<template>
  <div class="flex min-h-[calc(100dvh-160px)] flex-col">
    <div class="flex-1">
      <h1 class="text-[36px] leading-[1.11] font-semibold tracking-[-0.025em]">
        {{ t('navSwap') }}
      </h1>
      <p class="mt-2 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('swapDescription') }}
      </p>

      <div class="mt-6 space-y-3">
        <div class="rounded-[24px] border border-[#e5e5e5] bg-white p-4 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1)]">
          <div class="mb-2 flex items-center justify-between">
            <label class="text-[13px] text-[#737373]">{{ t('swapFrom') }}</label>
            <span class="text-[13px] text-[#737373]">
              {{ t('balance') }}: {{ fromBalanceFormatted.slice(0, 8) }} {{ fromToken }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <input
              v-model="amountIn"
              class="min-w-0 flex-1 bg-transparent text-[24px] font-semibold outline-none placeholder:text-[#d4d4d4]"
              type="text"
              inputmode="decimal"
              :placeholder="'0.0'"
              autocomplete="off"
            >
            <div class="rounded-2xl bg-[#f5f5f5] px-3 py-2 text-[14px] font-medium">
              {{ fromToken }}
            </div>
          </div>
        </div>

        <div class="flex justify-center">
          <button
            type="button"
            class="rounded-xl border border-[#e5e5e5] bg-white p-2 transition-transform hover:scale-110"
            :title="t('swapReverse')"
            @click="toggleDirection"
          >
            <ArrowDownUp class="size-5" />
          </button>
        </div>

        <div class="rounded-[24px] border border-[#e5e5e5] bg-white p-4 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1)]">
          <div class="mb-2">
            <label class="text-[13px] text-[#737373]">{{ t('swapTo') }}</label>
          </div>
          <div class="flex items-center gap-2">
            <div class="min-w-0 flex-1 text-[24px] font-semibold text-[#737373]">
              {{ isQuoting ? '...' : amountOut || '0.0' }}
            </div>
            <div class="rounded-2xl bg-[#f5f5f5] px-3 py-2 text-[14px] font-medium">
              {{ toToken }}
            </div>
          </div>
        </div>
      </div>

      <p v-if="insufficient" class="mt-4 text-[14px] leading-[1.43] text-[#e7000b]">
        {{ t('insufficient') }}
      </p>
      <p v-if="account.lastTxHash && explorerHref" class="mt-4 text-[14px] leading-[1.43]">
        {{ t('swapSuccess') }}
        <NuxtLink class="underline" :to="explorerHref" external>
          {{ t('explorer') }}
        </NuxtLink>
      </p>
      <p v-if="account.sessionExpired && !account.hasSession" class="mt-4 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('sessionExpiredPrompt') }}
      </p>
      <p v-if="localError || account.errorMessage" class="mt-4 text-[14px] leading-[1.43] text-[#e7000b]">
        {{ t(localError || account.errorMessage || '') }}
      </p>
    </div>

    <Button
      v-if="!account.hasSession"
      class="mt-6 h-11 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90"
      type="button"
      :disabled="account.status === 'opening'"
      @click="open"
    >
      {{ account.status === 'opening' ? t('opening') : account.sessionExpired ? t('continue') : t('start') }}
    </Button>
    <Button
      v-else
      class="mt-6 h-11 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90"
      type="button"
      :disabled="!canSwap || account.status === 'sending'"
      @click="onSwap"
    >
      {{ account.status === 'sending' ? t('swapping') : t('swap') }}
    </Button>
  </div>
</template>
