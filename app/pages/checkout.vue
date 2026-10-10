<script setup lang="ts">
import { Delete } from '@lucide/vue'
import { Button } from '@/components/ui/button'
import { buildErc20TransferUri, toAppPayPath } from '~/lib/eip681'
import { formatUsdcFromBase, parseUsdcToBase } from '~/lib/usdc-amount'
import { IS_MOCK_USDC, USDC_ADDRESS } from '~/lib/tokens'
import { clearCheckoutIntent, readCheckoutIntent, stashCheckoutIntent } from '~/lib/pending-checkout'
import type { TransferCandidate } from '~/lib/checkout-match'
import { matchCheckoutTransfer } from '~/lib/checkout-match'
import { getPublicClient } from '~/lib/ledger'
import { encodeQrDataUrl } from '~/lib/qr-encode'
import { blockRanges } from '~/lib/block-ranges'
import { readCheckoutLedger, recordCheckoutReceipt, summarizeToday, exportReceiptsAsCSV, downloadCSV, isSameLocalDay } from '~/lib/checkout-ledger'

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
          status: 'success',
        })
        ledgerTick.value++
      }
      state.value = 'success'
      playSuccessSound()
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

function exportTodayLedger() {
  if (!account.address)
    return
  const entries = readCheckoutLedger(account.address)
  const todayEntries = entries.filter(entry => isSameLocalDay(entry.receivedAt))
  const csv = exportReceiptsAsCSV(todayEntries, { locale: locale.value })
  const today = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `flowpay-ledger-${today}.csv`)
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

function playSuccessSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.1)

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  }
  catch (error) {
    // Fail soft if sound is blocked or unavailable
    console.debug('Success sound unavailable:', error)
  }
}
</script>

<template>
  <div class="flex h-[calc(100dvh-160px)] max-h-[calc(100dvh-160px)] flex-col overflow-hidden">
    <!-- Idle: amount + keypad -->
    <div v-if="state === 'idle'" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-baseline justify-between gap-2">
        <h1 class="text-[16px] font-semibold tracking-[-0.02em]">
          {{ t('checkout') }}
        </h1>
        <p class="truncate text-[12px] text-[#737373]">
          <template v-if="todaySummary.count > 0">
            {{ t('todayLedgerSummary', { count: todaySummary.count, total: formatUsdcFromBase(todaySummary.totalBase) }) }}
          </template>
          <template v-else>
            {{ t('todayLedgerEmpty') }}
          </template>
        </p>
      </div>

      <p class="mt-2 shrink-0 text-right text-[36px] leading-[1.1] font-semibold tracking-[-0.04em] tabular-nums">
        <span :class="amountText ? 'text-[#0a0a0a]' : 'text-[#737373]'">{{ amountText || '0' }}</span>
        <span class="ml-1 text-[14px] font-medium tracking-normal text-[#737373]">{{ IS_MOCK_USDC ? 'mUSDC' : 'USDC' }}</span>
      </p>

      <div class="mt-2 grid min-h-0 flex-1 grid-cols-3 gap-1.5 content-stretch">
        <button
          v-for="key in keys"
          :key="key"
          type="button"
          class="flex min-h-0 items-center justify-center rounded-2xl bg-[#f5f5f5] text-[17px] font-medium text-[#0a0a0a] outline-none active:scale-[0.98]"
          :aria-label="key === 'back' ? t('payBackspace') : key === '.' ? t('payDecimal') : key"
          @click="pressKey(key)"
        >
          <Delete v-if="key === 'back'" class="size-4" :stroke-width="1.75" />
          <template v-else>
            {{ key }}
          </template>
        </button>
      </div>

      <div class="mt-2 flex shrink-0 gap-2">
        <Button
          v-if="todaySummary.count > 0"
          variant="outline"
          class="h-10 flex-1 border-[#e5e5e5] bg-white shadow-none"
          @click="exportTodayLedger"
        >
          {{ t('exportCSV') }}
        </Button>
        <Button
          class="h-10 flex-[2]"
          :disabled="!canStartCheckout"
          @click="startCheckout"
        >
          {{ t('startCheckout') }}
        </Button>
      </div>
    </div>

    <!-- Pending: compact QR -->
    <div v-else-if="state === 'pending'" class="flex min-h-0 flex-1 flex-col">
      <div class="shrink-0 text-center">
        <p class="text-[28px] font-semibold tracking-[-0.03em] tabular-nums">
          {{ formatUsdcFromBase(parsedAmount ?? 0n) }}
          <span class="text-[14px] font-medium text-[#737373]">{{ IS_MOCK_USDC ? 'mUSDC' : 'USDC' }}</span>
        </p>
        <p class="mt-1 text-[13px] text-[#737373]">
          {{ t('checkoutWaiting') }}
        </p>
      </div>

      <div class="flex min-h-0 flex-1 items-center justify-center py-2">
        <div class="rounded-2xl border border-[#e5e5e5] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <img
            v-if="qrDataUri"
            :src="qrDataUri"
            alt="Payment QR code"
            class="size-[min(42vw,180px)]"
          >
        </div>
      </div>

      <div class="shrink-0 space-y-2">
        <div class="flex gap-2">
          <Button
            variant="outline"
            class="h-9 flex-1 border-[#e5e5e5] bg-white text-[13px] shadow-none"
            @click="copiedUri"
          >
            {{ t('copyUri') }}
          </Button>
          <Button
            variant="outline"
            class="h-9 flex-1 border-[#e5e5e5] bg-white text-[13px] shadow-none"
            @click="copiedLink"
          >
            {{ t('copyPayLink') }}
          </Button>
        </div>
        <Button
          variant="outline"
          class="h-10 w-full border-[#e5e5e5] bg-white shadow-none"
          @click="cancelCheckout"
        >
          {{ t('cancel') }}
        </Button>
      </div>
    </div>

    <!-- Success -->
    <div v-else-if="state === 'success'" class="flex min-h-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <div class="inline-flex items-center justify-center rounded-full bg-[#16a34a] p-5 animate-[scale-in_0.4s_ease-out]">
          <p class="text-[40px] leading-none font-bold text-white">
            ✓
          </p>
        </div>
        <p class="mt-4 text-[28px] font-bold tracking-[-0.025em] text-[#16a34a] tabular-nums">
          {{ formatUsdcFromBase(parsedAmount ?? 0n) }}
          <span class="text-[14px] font-medium">{{ IS_MOCK_USDC ? 'mUSDC' : 'USDC' }}</span>
        </p>
        <p class="mt-1 text-[15px] font-semibold">
          {{ t('checkoutSuccess') }}
        </p>
        <p v-if="explorerHref" class="mt-2 text-[13px]">
          <NuxtLink class="underline" :to="explorerHref" external>
            {{ t('explorer') }}
          </NuxtLink>
        </p>
      </div>
      <Button class="mt-2 h-10 w-full shrink-0" @click="startOver">
        {{ t('checkoutAgain') }}
      </Button>
    </div>

    <!-- Timeout -->
    <div v-else-if="state === 'timeout'" class="flex min-h-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
        <p class="text-[28px] font-semibold tabular-nums">
          {{ formatUsdcFromBase(parsedAmount ?? 0n) }}
          <span class="text-[14px] font-medium text-[#737373]">{{ IS_MOCK_USDC ? 'mUSDC' : 'USDC' }}</span>
        </p>
        <p class="mt-2 text-[14px] text-[#737373]">
          {{ t('checkoutTimeout') }}
        </p>
      </div>
      <Button class="mt-2 h-10 w-full shrink-0" @click="startOver">
        {{ t('checkoutAgain') }}
      </Button>
    </div>
  </div>
</template>

<style scoped>
@keyframes scale-in {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
