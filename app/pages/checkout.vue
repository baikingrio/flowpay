<script setup lang="ts">
import { Check, Copy, Delete } from '@lucide/vue'
import { parseEther } from 'viem'
import { Button } from '@/components/ui/button'
import { formatUsdcFromBase, parseUsdcToBase } from '~/lib/usdc-amount'
import { IS_MOCK_USDC, USDC_ADDRESS } from '~/lib/tokens'
import { clearCheckoutIntent, readCheckoutIntent, stashCheckoutIntent } from '~/lib/pending-checkout'
import type { CheckoutIntent, TransferLog } from '~/lib/checkout-match'
import { CHECKOUT_WINDOW_MS, LEGACY_LOOKBACK_BLOCKS, createRequestGate, matchTransferLog, newCheckoutRequestId, nextScanWindow, startBlockFor } from '~/lib/checkout-match'
import { formatMon, getPublicClient, readBalance } from '~/lib/ledger'
import { encodeQrDataUrl } from '~/lib/qr-encode'
import { blockRanges } from '~/lib/block-ranges'
import { shortAddress } from '~/lib/format'
import { readCheckoutLedger, recordCheckoutReceipt, summarizeToday, exportReceiptsAsCSV, downloadCSV, isSameLocalDay } from '~/lib/checkout-ledger'
import type { ReceiveAsset } from '~/lib/receive'
import { buildReceivePayLink, buildReceiveUri, matchNativeArrival, receiptTokenFor } from '~/lib/receive'

const { t, locale } = useI18n()
const account = useAccountStore()
const { open } = useSigningSession()

definePageMeta({
  layout: 'shell',
})

/** idle = keypad; address = any-amount code (no detection); pending/success/timeout = fixed amount flow. */
type CheckoutState = 'idle' | 'address' | 'pending' | 'success' | 'timeout'

const state = ref<CheckoutState>('idle')
const asset = ref<ReceiveAsset>('usdc')
const amountText = ref('')
const paymentUri = ref('')
const paymentLink = ref('')
const qrDataUri = ref('')
const matchedTxHash = ref<`0x${string}` | undefined>()
const POLL_INTERVAL_MS = 1500
/** Live receive request; poll results for any other id are dropped. */
const gate = createRequestGate()
let pollTimer: ReturnType<typeof setTimeout> | undefined
/** Last block already scanned for the active request (USDC only). */
let scanCursor: bigint | undefined
const ledgerTick = ref(0)
const copied = ref<'address' | 'uri' | 'link'>()
const starting = ref(false)
const startError = ref(false)

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

const usdcLabel = IS_MOCK_USDC ? 'mUSDC' : 'USDC'
const assetLabel = computed(() => asset.value === 'usdc' ? usdcLabel : 'MON')

function parseAmount(raw: string, kind: ReceiveAsset): bigint | undefined {
  const cleaned = raw.endsWith('.') ? raw.slice(0, -1) : raw
  if (!cleaned || cleaned === '.')
    return undefined
  try {
    const value = kind === 'usdc' ? parseUsdcToBase(cleaned) : parseEther(cleaned)
    return value > 0n ? value : undefined
  }
  catch {
    return undefined
  }
}

function formatAmount(value: bigint, kind: ReceiveAsset): string {
  return kind === 'usdc' ? formatUsdcFromBase(value) : formatMon(value)
}

const parsedAmount = computed(() => parseAmount(amountText.value, asset.value))
const hasAmount = computed(() => parsedAmount.value !== undefined)
const displayAmount = computed(() => formatAmount(parsedAmount.value ?? 0n, asset.value))

const explorerHref = computed(() =>
  matchedTxHash.value
    ? `https://testnet.monadexplorer.com/tx/${matchedTxHash.value}`
    : undefined,
)

const todaySummary = computed(() => {
  void ledgerTick.value
  if (!account.address)
    return summarizeToday([])
  return summarizeToday(readCheckoutLedger(account.address))
})

const todayTotalText = computed(() => {
  const parts: string[] = []
  if (todaySummary.value.totalBase > 0n || todaySummary.value.totalMonWei === 0n)
    parts.push(`${formatUsdcFromBase(todaySummary.value.totalBase)} ${usdcLabel}`)
  if (todaySummary.value.totalMonWei > 0n)
    parts.push(`${formatMon(todaySummary.value.totalMonWei)} MON`)
  return parts.join(' · ')
})

function setAsset(next: ReceiveAsset) {
  if (asset.value === next)
    return
  asset.value = next
  amountText.value = ''
}

function pressKey(key: typeof keys[number]) {
  startError.value = false
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
  const maxFraction = asset.value === 'usdc' ? 6 : 18
  if (whole.length > 18 || (fraction !== undefined && fraction.length > maxFraction))
    return
  amountText.value = next
}

async function renderCode(kind: ReceiveAsset, to: `0x${string}`, amount?: bigint) {
  const uri = buildReceiveUri({ asset: kind, to, usdcToken: USDC_ADDRESS, amount })
  paymentUri.value = uri
  // HTTPS pay link (not raw EIP-681) in the QR so phone cameras open Flowpay's pay page
  paymentLink.value = buildReceivePayLink(window.location.origin, uri)
  qrDataUri.value = await encodeQrDataUrl(paymentLink.value)
}

async function ensureAddress(): Promise<`0x${string}` | undefined> {
  if (!account.address)
    await open()
  return account.address
}

async function onPrimary() {
  if (starting.value)
    return
  if (hasAmount.value)
    await startCheckout()
  else
    await showAddressCode()
}

async function showAddressCode() {
  const to = await ensureAddress()
  if (!to)
    return
  await renderCode(asset.value, to)
  state.value = 'address'
}

async function startCheckout() {
  const amount = parsedAmount.value
  if (!amount)
    return
  const to = await ensureAddress()
  if (!to)
    return

  starting.value = true
  startError.value = false
  try {
    let baselineWei: bigint | undefined
    let startBlock: bigint
    try {
      const [latest, baseline] = await Promise.all([
        getPublicClient().getBlockNumber(),
        asset.value === 'mon' ? readBalance(to) : Promise.resolve(undefined),
      ])
      startBlock = startBlockFor(latest)
      baselineWei = baseline
    }
    catch (error) {
      console.error('Failed to prepare receive request:', error)
      startError.value = true
      return
    }

    await renderCode(asset.value, to, amount)

    const intent: CheckoutIntent = {
      expectedTo: to,
      amountBase: amount,
      startedAt: Date.now(),
      token: USDC_ADDRESS,
      asset: asset.value,
      baselineWei,
      id: newCheckoutRequestId(),
      startBlock,
    }
    stashCheckoutIntent(intent)

    matchedTxHash.value = undefined
    state.value = 'pending'
    startPolling(intent)
  }
  finally {
    starting.value = false
  }
}

function cancelCheckout() {
  stopPolling()
  clearCheckoutIntent()
  state.value = 'idle'
  matchedTxHash.value = undefined
}

function backToKeypad() {
  state.value = 'idle'
}

function startOver() {
  stopPolling()
  state.value = 'idle'
  amountText.value = ''
  matchedTxHash.value = undefined
  clearCheckoutIntent()
}

/** Self-scheduling loop: one poll in flight at a time, next one queued only after it finishes. */
function startPolling(intent: CheckoutIntent) {
  stopPolling()
  const id = intent.id ?? newCheckoutRequestId()
  gate.begin(id)
  scanCursor = intent.startBlock !== undefined ? intent.startBlock - 1n : undefined

  const tick = async () => {
    pollTimer = undefined
    if (!gate.tryEnter(id))
      return
    try {
      await pollOnce(intent, id)
    }
    finally {
      gate.leave(id)
    }
    if (gate.isActive(id))
      pollTimer = setTimeout(tick, POLL_INTERVAL_MS)
  }
  void tick()
}

function stopPolling() {
  gate.end()
  if (pollTimer !== undefined) {
    clearTimeout(pollTimer)
    pollTimer = undefined
  }
  scanCursor = undefined
}

function markSuccess(id: string, intent: CheckoutIntent, hash?: `0x${string}`) {
  // Idempotent: only the first result for the live request lands.
  if (!gate.claimSuccess(id))
    return
  const known = hash
    ? readCheckoutLedger(intent.expectedTo).some(entry => entry.hash?.toLowerCase() === hash.toLowerCase())
    : false
  if (!known) {
    recordCheckoutReceipt(intent.expectedTo, {
      hash,
      token: receiptTokenFor(intent.asset ?? 'usdc'),
      amountBase: intent.amountBase,
      to: intent.expectedTo,
      status: 'success',
    })
  }
  matchedTxHash.value = hash
  ledgerTick.value++
  state.value = 'success'
  playSuccessSound()
  navigator.vibrate?.(30)
  stopPolling()
  clearCheckoutIntent()
}

const TRANSFER_EVENT = {
  type: 'event',
  name: 'Transfer',
  inputs: [
    { type: 'address', indexed: true, name: 'from' },
    { type: 'address', indexed: true, name: 'to' },
    { type: 'uint256', indexed: false, name: 'value' },
  ],
} as const

async function pollOnce(intent: CheckoutIntent, id: string) {
  if (!account.address)
    return

  if (Date.now() > intent.startedAt + CHECKOUT_WINDOW_MS) {
    if (gate.isActive(id)) {
      stopPolling()
      state.value = 'timeout'
    }
    return
  }

  try {
    if (intent.asset === 'mon') {
      if (intent.baselineWei === undefined)
        return
      const currentWei = await readBalance(intent.expectedTo)
      if (gate.isActive(id) && matchNativeArrival({ baselineWei: intent.baselineWei, currentWei, amountWei: intent.amountBase }))
        markSuccess(id, intent)
      return
    }

    const client = getPublicClient()
    const latest = await client.getBlockNumber()
    if (!gate.isActive(id))
      return
    const startBlock = intent.startBlock ?? (latest > LEGACY_LOOKBACK_BLOCKS ? latest - LEGACY_LOOKBACK_BLOCKS : 0n)
    if (scanCursor === undefined)
      scanCursor = startBlock - 1n
    const scan = nextScanWindow(scanCursor, latest)
    if (!scan)
      return

    const knownHashes = new Set(
      readCheckoutLedger(intent.expectedTo)
        .map(entry => entry.hash?.toLowerCase())
        .filter((hash): hash is `0x${string}` => Boolean(hash)),
    )

    for (const [fromBlock, toBlock] of blockRanges(scan.from, scan.to, 100)) {
      const logs = await client.getLogs({
        address: USDC_ADDRESS,
        event: TRANSFER_EVENT,
        args: { to: intent.expectedTo },
        fromBlock,
        toBlock,
      })
      // Request cancelled / replaced while we waited: drop this result.
      if (!gate.isActive(id))
        return
      const candidates: TransferLog[] = logs.map(log => ({
        hash: log.transactionHash!,
        to: log.args.to!,
        value: log.args.value!,
        blockNumber: log.blockNumber!,
      }))
      const match = matchTransferLog(intent, candidates, startBlock, knownHashes)
      if (match) {
        markSuccess(id, intent, match.hash)
        return
      }
      // Only advance past blocks that were actually scanned; a failed chunk is retried next poll.
      scanCursor = toBlock
    }
  }
  catch (error) {
    console.error('Poll error:', error)
  }
}

async function copy(value: string, kind: 'address' | 'uri' | 'link') {
  if (!value)
    return
  await navigator.clipboard.writeText(value)
  copied.value = kind
  window.setTimeout(() => {
    if (copied.value === kind)
      copied.value = undefined
  }, 1500)
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
  const intent = readCheckoutIntent()
  if (intent && account.address && account.address.toLowerCase() === intent.expectedTo.toLowerCase()) {
    const kind = intent.asset ?? 'usdc'
    asset.value = kind
    amountText.value = formatAmount(intent.amountBase, kind)
    await renderCode(kind, intent.expectedTo, intent.amountBase)
    state.value = 'pending'
    startPolling(intent)
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
    <!-- Idle: token + amount + keypad -->
    <div v-if="state === 'idle'" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-baseline justify-between gap-2">
        <h1 class="text-[16px] font-semibold tracking-[-0.02em]">
          {{ t('checkout') }}
        </h1>
        <p class="truncate text-[12px] text-[#737373]">
          <template v-if="todaySummary.count > 0">
            {{ t('todayLedgerSummary', { count: todaySummary.count, total: todayTotalText }) }}
          </template>
          <template v-else>
            {{ t('todayLedgerEmpty') }}
          </template>
        </p>
      </div>

      <div class="mt-2 flex shrink-0 items-end justify-between gap-3">
        <div class="flex gap-1.5" role="group" :aria-label="t('receiveToken')">
          <button
            type="button"
            class="h-8 rounded-xl px-3 text-[12px] font-medium"
            :class="asset === 'usdc' ? 'bg-[#0a0a0a] text-[#fafafa]' : 'bg-[#f5f5f5] text-[#737373]'"
            :aria-pressed="asset === 'usdc'"
            @click="setAsset('usdc')"
          >
            {{ usdcLabel }}
          </button>
          <button
            type="button"
            class="h-8 rounded-xl px-3 text-[12px] font-medium"
            :class="asset === 'mon' ? 'bg-[#0a0a0a] text-[#fafafa]' : 'bg-[#f5f5f5] text-[#737373]'"
            :aria-pressed="asset === 'mon'"
            @click="setAsset('mon')"
          >
            MON
          </button>
        </div>
        <p class="min-w-0 truncate text-right text-[36px] leading-[1.1] font-semibold tracking-[-0.04em] tabular-nums">
          <span :class="amountText ? 'text-[#0a0a0a]' : 'text-[#737373]'">{{ amountText || '0' }}</span>
          <span class="ml-1 text-[14px] font-medium tracking-normal text-[#737373]">{{ assetLabel }}</span>
        </p>
      </div>

      <div class="mt-3 shrink-0 grid grid-cols-3 gap-2 rounded-[24px] border border-[#e5e5e5] bg-white p-3 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
        <button
          v-for="key in keys"
          :key="key"
          type="button"
          class="flex h-11 items-center justify-center rounded-[18px] bg-[#f5f5f5] text-[18px] leading-none font-medium text-[#0a0a0a] transition-transform duration-150 ease-out outline-none hover:bg-[#ececec] focus-visible:ring-1 focus-visible:ring-[#e5e5e5] active:translate-y-px active:scale-[0.98]"
          :aria-label="key === 'back' ? t('payBackspace') : key === '.' ? t('payDecimal') : key"
          @click="pressKey(key)"
        >
          <Delete v-if="key === 'back'" class="size-5" :stroke-width="1.75" />
          <span v-else>{{ key }}</span>
        </button>
      </div>

      <p v-if="startError" class="mt-2 shrink-0 truncate text-[12px] text-[#e7000b]">
        {{ t('receiveStartFailed') }}
      </p>

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
          v-if="hasAmount"
          class="h-10 flex-[2]"
          :disabled="starting"
          @click="onPrimary"
        >
          {{ t('receiveCreateCode') }}
        </Button>
        <Button
          v-else
          variant="outline"
          class="h-10 flex-[2] border-[#e5e5e5] bg-white shadow-none"
          @click="onPrimary"
        >
          {{ t('receiveAnyAmount') }}
        </Button>
      </div>
    </div>

    <!-- Any amount: address code, no arrival detection -->
    <div v-else-if="state === 'address'" class="flex min-h-0 flex-1 flex-col">
      <div class="shrink-0 text-center">
        <p class="text-[22px] font-semibold tracking-[-0.03em]">
          {{ t('receiveAnyAmountTitle') }}
          <span class="text-[14px] font-medium text-[#737373]">{{ assetLabel }}</span>
        </p>
        <p class="mt-1 text-[13px] text-[#737373]">
          {{ t('receiveAnyAmountHint') }}
        </p>
      </div>

      <div class="flex min-h-0 flex-1 items-center justify-center py-2">
        <div class="rounded-2xl border border-[#e5e5e5] bg-white p-3 shadow-[0_1px_3px_rgba(0,0,0,0.08)]">
          <img
            v-if="qrDataUri"
            :src="qrDataUri"
            :alt="t('receiveQrAlt')"
            class="size-[min(42vw,180px)]"
          >
        </div>
      </div>

      <div class="shrink-0 space-y-2">
        <div
          v-if="account.address"
          class="flex items-center justify-center gap-1.5 text-[14px] leading-[1.43] text-[#737373]"
        >
          <span class="font-mono tabular-nums">{{ shortAddress(account.address) }}</span>
          <button
            type="button"
            class="inline-flex size-7 items-center justify-center rounded-lg text-[#737373] transition-colors hover:bg-[#f5f5f5] hover:text-[#0a0a0a]"
            :aria-label="copied === 'address' ? t('copied') : t('copy')"
            @click="copy(account.address, 'address')"
          >
            <Check v-if="copied === 'address'" class="size-3.5" :stroke-width="2" />
            <Copy v-else class="size-3.5" :stroke-width="1.75" />
          </button>
        </div>
        <div class="flex gap-2">
          <Button
            variant="outline"
            class="h-10 flex-1 border-[#e5e5e5] bg-white shadow-none"
            @click="backToKeypad"
          >
            {{ t('back') }}
          </Button>
          <Button
            variant="outline"
            class="h-10 flex-1 border-[#e5e5e5] bg-white shadow-none"
            @click="copy(paymentLink, 'link')"
          >
            {{ copied === 'link' ? t('copiedLink') : t('copyPayLink') }}
          </Button>
        </div>
      </div>
    </div>

    <!-- Pending: compact QR -->
    <div v-else-if="state === 'pending'" class="flex min-h-0 flex-1 flex-col">
      <div class="shrink-0 text-center">
        <p class="text-[28px] font-semibold tracking-[-0.03em] tabular-nums">
          {{ displayAmount }}
          <span class="text-[14px] font-medium text-[#737373]">{{ assetLabel }}</span>
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
            :alt="t('receiveQrAlt')"
            class="size-[min(42vw,180px)]"
          >
        </div>
      </div>

      <div class="shrink-0 space-y-2">
        <div class="flex gap-2">
          <Button
            variant="outline"
            class="h-9 flex-1 border-[#e5e5e5] bg-white text-[13px] shadow-none"
            @click="copy(paymentUri, 'uri')"
          >
            {{ copied === 'uri' ? t('copiedUri') : t('copyUri') }}
          </Button>
          <Button
            variant="outline"
            class="h-9 flex-1 border-[#e5e5e5] bg-white text-[13px] shadow-none"
            @click="copy(paymentLink, 'link')"
          >
            {{ copied === 'link' ? t('copiedLink') : t('copyPayLink') }}
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
          {{ displayAmount }}
          <span class="text-[14px] font-medium">{{ assetLabel }}</span>
        </p>
        <p class="mt-1 text-[15px] font-semibold">
          {{ t('checkoutSuccess') }}
        </p>
        <p v-if="explorerHref" class="mt-2 text-[13px]">
          <NuxtLink class="underline" :to="explorerHref" external>
            {{ t('explorer') }}
          </NuxtLink>
        </p>
        <p v-else-if="asset === 'mon'" class="mt-2 text-[12px] text-[#737373]">
          {{ t('receiveMonNoHash') }}
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
          {{ displayAmount }}
          <span class="text-[14px] font-medium text-[#737373]">{{ assetLabel }}</span>
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
