<script setup lang="ts">
import { Delete } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { buildErc20TransferUri, toAppPayPath } from '~/lib/eip681'
import { formatUsdcFromBase, parseUsdcToBase } from '~/lib/usdc-amount'
import { USDC_ADDRESS } from '~/lib/tokens'
import { clearCheckoutIntent, readCheckoutIntent, stashCheckoutIntent } from '~/lib/pending-checkout'
import type { TransferCandidate } from '~/lib/checkout-match'
import { matchCheckoutTransfer } from '~/lib/checkout-match'
import { getPublicClient } from '~/lib/ledger'
import { encodeQrDataUrl } from '~/lib/qr-encode'
import { blockRanges } from '~/lib/block-ranges'
import { readCheckoutLedger, recordCheckoutReceipt, summarizeToday } from '~/lib/checkout-ledger'

const { t, locale } = useI18n()
const account = useAccountStore()
const { open } = useSigningSession()

definePageMeta({
  layout: 'shell',
})

type CheckoutState = 'idle' | 'pending' | 'success' | 'timeout'

const state = ref<CheckoutState>('idle')
const amountText = ref('')
const paymentUri = ref('')
const paymentLink = ref('')
const qrDataUri = ref('')
const matchedTxHash = ref<`0x${string}` | undefined>()
const pollTimer = ref<ReturnType<typeof setInterval> | undefined>()
const startBlockNumber = ref<bigint | undefined>()
const ledgerTick = ref(0)

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

const parsedAmount = computed(() => {
  if (!amountText.value)
    return undefined
  try {
    return parseUsdcToBase(amountText.value)
  }
  catch {
    return undefined
  }
})

const canStartCheckout = computed(() => parsedAmount.value !== undefined && parsedAmount.value > 0n)

const explorerHref = computed(() =>
  matchedTxHash.value
    ? `https://testnet.monadexplorer.com/tx/${matchedTxHash.value}`
    : undefined,
)

const todaySummary = computed(() => {
  ledgerTick.value
  if (!account.address)
    return { count: 0, totalBase: 0n, items: [] }
  const entries = readCheckoutLedger(account.address)
  return summarizeToday(entries)
})

function pressKey(key: typeof keys[number]) {
  if (key === 'back') {
    amountText.value = amountText.value.slice(0, -1)
    return
  }
  if (key === '.') {
    if (amountText.value.includes('.'))
      return
    amountText.value = amountText.value === '' ? '0.' : `${amountText.value}.`
    return
  }
  if (amountText.value === '0') {
    amountText.value = key
    return
  }
  const next = `${amountText.value}${key}`
  const [whole = '', fraction] = next.split('.')
  if (whole.length > 18 || (fraction !== undefined && fraction.length > 6))
    return
  amountText.value = next
}

async function startCheckout() {
  if (!account.address || !parsedAmount.value)
    return

  const uri = buildErc20TransferUri({
    token: USDC_ADDRESS,
    to: account.address,
    amount: parsedAmount.value,
    chainId: 10143,
  })

  paymentUri.value = uri
  // Use HTTPS pay link (not raw EIP-681) in QR for better mobile app compatibility
  paymentLink.value = `${window.location.origin}${toAppPayPath(uri)}`
  qrDataUri.value = await encodeQrDataUrl(paymentLink.value)

  const intent = {
    expectedTo: account.address,
    amountBase: parsedAmount.value,
    startedAt: Date.now(),
    token: USDC_ADDRESS,
  }
  stashCheckoutIntent(intent)

  state.value = 'pending'
  startPolling()
}

function cancelCheckout() {
  stopPolling()
  clearCheckoutIntent()
  state.value = 'idle'
  matchedTxHash.value = undefined
}

function startOver() {
  state.value = 'idle'
  amountText.value = ''
  matchedTxHash.value = undefined
  clearCheckoutIntent()
}

function startPolling() {
  stopPolling()
  pollTimer.value = setInterval(async () => {
    await checkForMatch()
  }, 2000)
}

function stopPolling() {
  if (pollTimer.value !== undefined) {
    clearInterval(pollTimer.value)
    pollTimer.value = undefined
  }
}

async function checkForMatch() {
  const intent = readCheckoutIntent()
  if (!intent || !account.address)
    return

  const nowMs = Date.now()
  if (nowMs > intent.startedAt + 300_000) {
    stopPolling()
    state.value = 'timeout'
    return
  }

  try {
    const client = getPublicClient()

    if (!startBlockNumber.value) {
      const latestBlock = await client.getBlockNumber()
      const lookbackBlocks = 2000n
      startBlockNumber.value = latestBlock > lookbackBlocks ? latestBlock - lookbackBlocks : 0n
    }

    const latestBlock = await client.getBlockNumber()
    const ranges = blockRanges(startBlockNumber.value, latestBlock, 100)

    const candidates: TransferCandidate[] = []

    for (const [fromBlock, toBlock] of ranges) {
      try {
        const logs = await client.getLogs({
          address: USDC_ADDRESS,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { type: 'address', indexed: true, name: 'from' },
              { type: 'address', indexed: true, name: 'to' },
              { type: 'uint256', indexed: false, name: 'value' },
            ],
          },
          args: {
            to: account.address,
          },
          fromBlock,
          toBlock,
        })

        for (const log of logs) {
          const block = await client.getBlock({ blockHash: log.blockHash! })
          candidates.push({
            hash: log.transactionHash!,
            to: log.args.to!,
            value: log.args.value!,
            timestampMs: Number(block.timestamp) * 1000,
          })
        }
      }
      catch (chunkError) {
        console.error(`Failed to fetch logs for blocks ${fromBlock}-${toBlock}:`, chunkError)
      }
    }

    const match = matchCheckoutTransfer(intent, candidates, nowMs)
    if (match) {
      matchedTxHash.value = match.hash
      if (account.address) {
        recordCheckoutReceipt(account.address, {
          hash: match.hash,
          amountBase: intent.amountBase,
          to: intent.expectedTo,
        })
        ledgerTick.value++
      }
      state.value = 'success'
      stopPolling()
      clearCheckoutIntent()
    }
  }
  catch (error) {
    console.error('Poll error:', error)
  }
}

async function copiedUri() {
  await navigator.clipboard.writeText(paymentUri.value)
}

async function copiedLink() {
  await navigator.clipboard.writeText(paymentLink.value)
}

onMounted(async () => {
  if (!account.hasSession) {
    await open()
  }
  const intent = readCheckoutIntent()
  if (intent && account.address === intent.expectedTo) {
    const amountFormatted = formatUsdcFromBase(intent.amountBase)
    amountText.value = amountFormatted

    const uri = buildErc20TransferUri({
      token: USDC_ADDRESS,
      to: account.address,
      amount: intent.amountBase,
      chainId: 10143,
    })

    paymentUri.value = uri
    // Use HTTPS pay link (not raw EIP-681) in QR for better mobile app compatibility
    paymentLink.value = `${window.location.origin}${toAppPayPath(uri)}`
    qrDataUri.value = await encodeQrDataUrl(paymentLink.value)

    state.value = 'pending'
    startPolling()
  }
  ledgerTick.value++
})

onBeforeUnmount(() => {
  stopPolling()
})
</script>

<template>
  <div class="flex min-h-[calc(100dvh-160px)] flex-col">
    <div v-if="state === 'idle'" class="flex flex-1 flex-col">
      <h1 class="text-[24px] leading-[1.33] font-semibold tracking-[-0.025em]">
        {{ t('checkout') }}
      </h1>
      <p class="mt-2 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('checkoutDescription') }}
      </p>

      <p class="mt-8 text-[48px] leading-[1.1] font-semibold tracking-[-0.05em] tabular-nums">
        <span :class="amountText ? 'text-[#0a0a0a]' : 'text-[#737373]'">
          {{ amountText || '0' }}
        </span>
        <span class="ml-2 text-[18px] font-medium tracking-normal text-[#737373]">USDC</span>
      </p>

      <div class="mt-8 grid grid-cols-3 gap-2 rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <button
          v-for="key in keys"
          :key="key"
          type="button"
          class="flex h-12 items-center justify-center rounded-[18px] bg-[#f5f5f5] text-[18px] leading-[1.56] font-medium text-[#0a0a0a] transition-transform duration-150 ease-out outline-none hover:bg-[#ececec] focus-visible:ring-1 focus-visible:ring-[#e5e5e5] active:translate-y-px active:scale-[0.98]"
          :aria-label="key === 'back' ? t('payBackspace') : key === '.' ? t('payDecimal') : key"
          @click="pressKey(key)"
        >
          <Delete v-if="key === 'back'" class="size-5" :stroke-width="1.75" />
          <template v-else>
            {{ key }}
          </template>
        </button>
      </div>

      <div v-if="todaySummary.count > 0" class="mt-8 rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <h2 class="text-[16px] leading-[1.5] font-semibold">
          {{ t('todayLedger') }}
        </h2>
        <p class="mt-1 text-[14px] leading-[1.43] text-[#737373]">
          {{ t('todayLedgerSummary', { count: todaySummary.count, total: formatUsdcFromBase(todaySummary.totalBase) }) }}
        </p>
        <div v-if="todaySummary.items.length > 0" class="mt-4 space-y-2">
          <div
            v-for="item in todaySummary.items"
            :key="item.hash"
            class="flex items-center justify-between text-[14px] leading-[1.43]"
          >
            <span class="text-[#737373]">{{ new Date(item.receivedAt).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) }}</span>
            <span class="font-medium tabular-nums">{{ formatUsdcFromBase(item.amountBase) }} USDC</span>
            <NuxtLink
              :to="`https://testnet.monadexplorer.com/tx/${item.hash}`"
              external
              class="text-[#0a0a0a] underline"
            >
              ↗
            </NuxtLink>
          </div>
        </div>
        <p class="mt-4 text-[12px] leading-[1.5] text-[#a3a3a3]">
          {{ t('todayLedgerFootnote') }}
        </p>
      </div>
      <div v-else class="mt-8 rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <h2 class="text-[16px] leading-[1.5] font-semibold">
          {{ t('todayLedger') }}
        </h2>
        <p class="mt-1 text-[14px] leading-[1.43] text-[#737373]">
          {{ t('todayLedgerEmpty') }}
        </p>
        <p class="mt-4 text-[12px] leading-[1.5] text-[#a3a3a3]">
          {{ t('todayLedgerFootnote') }}
        </p>
      </div>

      <div class="mt-auto pt-6">
        <Button
          class="w-full"
          :disabled="!canStartCheckout"
          @click="startCheckout"
        >
          {{ t('startCheckout') }}
        </Button>
      </div>
    </div>

    <div v-else-if="state === 'pending'" class="flex flex-1 flex-col items-center justify-center">
      <p class="text-[36px] leading-[1.11] font-semibold tracking-[-0.025em]">
        {{ formatUsdcFromBase(parsedAmount!) }} USDC
      </p>
      <p class="mt-2 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('checkoutWaiting') }}
      </p>

      <div class="mt-8 rounded-[24px] border border-[#e5e5e5] bg-white p-8 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <img
          v-if="qrDataUri"
          :src="qrDataUri"
          alt="Payment QR code"
          class="size-64"
        >
      </div>

      <div class="mt-4 flex gap-2">
        <Button
          variant="outline"
          class="border-[#e5e5e5] bg-white shadow-none"
          @click="copiedUri"
        >
          {{ t('copyUri') }}
        </Button>
        <Button
          variant="outline"
          class="border-[#e5e5e5] bg-white shadow-none"
          @click="copiedLink"
        >
          {{ t('copyPayLink') }}
        </Button>
      </div>

      <div class="mt-auto pt-6 w-full">
        <Button
          variant="outline"
          class="w-full border-[#e5e5e5] bg-white shadow-none"
          @click="cancelCheckout"
        >
          {{ t('cancel') }}
        </Button>
      </div>
    </div>

    <div v-else-if="state === 'success'" class="flex flex-1 flex-col items-center justify-center">
      <div class="text-center">
        <p class="text-[48px] leading-[1.1] font-semibold tracking-[-0.05em] text-[#0a0a0a]">
          ✓
        </p>
        <p class="mt-4 text-[36px] leading-[1.11] font-semibold tracking-[-0.025em]">
          {{ formatUsdcFromBase(parsedAmount!) }} USDC
        </p>
        <p class="mt-2 text-[14px] leading-[1.43] text-[#737373]">
          {{ t('checkoutSuccess') }}
        </p>
        <p v-if="explorerHref" class="mt-4 text-[14px] leading-[1.43]">
          <NuxtLink class="underline" :to="explorerHref" external>
            {{ t('explorer') }}
          </NuxtLink>
        </p>
      </div>

      <div class="mt-auto pt-6 w-full">
        <Button
          class="w-full"
          @click="startOver"
        >
          {{ t('checkoutAgain') }}
        </Button>
      </div>
    </div>

    <div v-else-if="state === 'timeout'" class="flex flex-1 flex-col items-center justify-center">
      <div class="text-center">
        <p class="text-[36px] leading-[1.11] font-semibold tracking-[-0.025em]">
          {{ formatUsdcFromBase(parsedAmount!) }} USDC
        </p>
        <p class="mt-2 text-[14px] leading-[1.43] text-[#737373]">
          {{ t('checkoutTimeout') }}
        </p>
      </div>

      <div class="mt-auto pt-6 w-full">
        <Button
          class="w-full"
          @click="startOver"
        >
          {{ t('checkoutAgain') }}
        </Button>
      </div>
    </div>
  </div>
</template>
