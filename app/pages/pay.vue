<script setup lang="ts">
import { Check, Delete } from '@lucide/vue'
import { isAddress, parseEther, type Address } from 'viem'
import { Button } from '@/components/ui/button'
import { parsePaymentUri, unwrapPaymentInput, type ParsePaymentUriFailure } from '~/lib/eip681'
import { resolveEnsName } from '~/lib/ens'
import { shortAddress } from '~/lib/format'
import { formatMon } from '~/lib/ledger'
import { clearPendingPayUri, readPendingPayUri } from '~/lib/pending-pay-uri'
import { IS_MOCK_USDC, USDC_ADDRESS } from '~/lib/tokens'
import { parseAssetParam } from '~/lib/assets'
import { PAY_AMOUNT_PERCENTS, formatMaxPayAmount, formatPercentPayAmount } from '~/lib/pay-amount'
import { formatUsdcFromBase, parseUsdcToBase } from '~/lib/usdc-amount'

const { t } = useI18n()
const route = useRoute()
const account = useAccountStore()
const { open, send, sendUsdc } = useSigningSession()

type Asset = 'mon' | 'usdc'

definePageMeta({
  layout: 'shell',
})

const recipient = ref('')
const amountText = ref('')
const asset = ref<Asset>('usdc')
/** Shared with home/asset pages via the account store. */
const usdcBalance = computed(() => account.usdcBase ?? 0n)
const localError = ref<string | undefined>()
const localWarning = ref<string | undefined>()
const externalPrefill = ref(false)
const toField = ref<HTMLInputElement | null>(null)

interface PaySuccess {
  hash: `0x${string}`
  amount: string
  token: string
  to: Address
}
/** Set after a confirmed send; replaces the keypad with a success card. */
const success = ref<PaySuccess | undefined>()
const busy = computed(() =>
  account.status === 'opening' || account.status === 'sending' || account.status === 'confirming',
)
const busyLabel = computed(() => {
  if (account.status === 'opening')
    return t('payVerifying')
  if (account.status === 'confirming')
    return t('payConfirming')
  return t('sending')
})

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

const parsedAmount = computed(() => parseAmountText(amountText.value, asset.value))
const parsedRecipient = computed(() => {
  const value = recipient.value.trim()
  if (!isAddress(value))
    return undefined
  return value as Address
})
const assetLabel = computed(() => asset.value === 'usdc' ? (IS_MOCK_USDC ? 'mUSDC' : 'USDC') : 'MON')

function setAsset(next: Asset) {
  if (asset.value === next)
    return
  asset.value = next
  amountText.value = ''
  localError.value = undefined
}
const recentRecipients = computed(() => {
  const seen = new Set<string>()
  return account.activity
    .map(item => item.to)
    .filter((address) => {
      const key = address.toLowerCase()
      if (seen.has(key))
        return false
      seen.add(key)
      return true
    })
    .slice(0, 5)
})
const successExplorerHref = computed(() =>
  success.value ? `https://testnet.monadexplorer.com/tx/${success.value.hash}` : undefined,
)
const insufficient = computed(() => {
  if (parsedAmount.value === undefined)
    return false
  if (asset.value === 'usdc')
    return usdcBalance.value < parsedAmount.value
  return account.balanceWei !== undefined && account.balanceWei <= parsedAmount.value
})
const insufficientGas = computed(() =>
  asset.value === 'usdc' && account.balanceWei !== undefined && account.balanceWei === 0n,
)
const canPay = computed(() => {
  if (!account.address || parsedRecipient.value === undefined || parsedAmount.value === undefined)
    return false
  if (asset.value === 'usdc')
    return usdcBalance.value >= parsedAmount.value && account.balanceWei !== undefined && account.balanceWei > 0n
  return account.balanceWei !== undefined && account.balanceWei > parsedAmount.value
})

/** Max sendable amount text for the current asset; undefined → percent/Max chips disabled. */
const maxAmountText = computed(() => {
  if (!account.address)
    return undefined
  return formatMaxPayAmount(asset.value, {
    usdcBase: account.usdcBase,
    balanceWei: account.balanceWei,
  })
})
const balanceArgs = computed(() => ({
  usdcBase: account.usdcBase,
  balanceWei: account.balanceWei,
}))
const percentChips = computed(() =>
  PAY_AMOUNT_PERCENTS.map(percent => ({
    percent,
    label: `${percent}%`,
    amount: account.address
      ? formatPercentPayAmount(asset.value, balanceArgs.value, percent)
      : undefined,
  })),
)
const amountChipsEnabled = computed(() => maxAmountText.value !== undefined && !busy.value)
const isMaxActive = computed(() =>
  maxAmountText.value !== undefined && amountText.value === maxAmountText.value,
)

const statusLine = computed(() =>
  Boolean(
    localError.value
    || account.errorMessage
    || insufficient.value
    || insufficientGas.value
    || localWarning.value
    || account.balanceWei === 0n,
  ),
)
const statusTone = computed(() =>
  (localError.value || account.errorMessage || insufficient.value || insufficientGas.value) ? 'error' : 'muted',
)



function parseAmountText(raw: string, assetType: Asset): bigint | undefined {
  const cleaned = raw.endsWith('.') ? raw.slice(0, -1) : raw
  if (!cleaned || cleaned === '.')
    return undefined
  try {
    if (assetType === 'usdc') {
      const value = parseUsdcToBase(cleaned)
      return value > 0n ? value : undefined
    }
    else {
      const value = parseEther(cleaned)
      return value > 0n ? value : undefined
    }
  }
  catch {
    return undefined
  }
}

function pressKey(key: typeof keys[number]) {
  localError.value = undefined
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
  if (whole.length > 18 || (fraction !== undefined && fraction.length > 18))
    return
  amountText.value = next
}

/** Percent chip: floor(max × percent / 100). No-op when chips are unavailable. */
function applyPercent(percent: typeof PAY_AMOUNT_PERCENTS[number]) {
  if (busy.value || success.value || !account.address)
    return
  const next = formatPercentPayAmount(asset.value, balanceArgs.value, percent)
  if (next === undefined) {
    if (asset.value === 'mon' || (account.balanceWei !== undefined && account.balanceWei === 0n))
      localError.value = 'insufficientGas'
    return
  }
  localError.value = undefined
  amountText.value = next
}

/** Max: full mUSDC, or MON minus gas reserve. No-op when Max is unavailable. */
function applyMax() {
  if (busy.value || success.value)
    return
  const next = maxAmountText.value
  if (next === undefined) {
    // Balance too low for Max — surface the existing gas / faucet hint path.
    if (asset.value === 'mon' || (account.balanceWei !== undefined && account.balanceWei === 0n))
      localError.value = 'insufficientGas'
    return
  }
  localError.value = undefined
  amountText.value = next
}

async function applyPaymentInput(raw: string): Promise<void> {
  localError.value = undefined
  localWarning.value = undefined
  const parsed = parsePaymentUri(raw, 10143)
  if (!parsed.ok) {
    localError.value = mapParseError(parsed.error)
    return
  }

  let address = parsed.address
  if (!address && parsed.ensName) {
    address = await resolveEnsName(parsed.ensName)
    if (!address) {
      localError.value = 'ensUnresolved'
      return
    }
  }
  if (!address) {
    localError.value = 'invalidAddress'
    return
  }

  recipient.value = address
  externalPrefill.value = true

  if (parsed.tokenAddress) {
    if (parsed.tokenAddress.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
      localError.value = 'unsupportedToken'
      return
    }
    // Any-amount ERC-20 request (no uint256): pick USDC, payer types the amount.
    if (asset.value !== 'usdc' || parsed.tokenAmount !== undefined)
      amountText.value = parsed.tokenAmount !== undefined ? formatUsdcFromBase(parsed.tokenAmount) : ''
    asset.value = 'usdc'
  }
  else if (parsed.valueWei !== undefined) {
    asset.value = 'mon'
    amountText.value = formatMon(parsed.valueWei)
  }
  else if (unwrapPaymentInput(raw).toLowerCase().startsWith('ethereum:')) {
    // Native EIP-681 request without value = "any amount" MON request.
    if (asset.value !== 'mon')
      amountText.value = ''
    asset.value = 'mon'
  }

  for (const warning of parsed.warnings) {
    if (warning === 'missing_chain')
      localWarning.value = 'missingChain'
    if (warning === 'bad_value')
      localWarning.value = 'amountNotImported'
  }
}

function mapParseError(error: ParsePaymentUriFailure['error']): string {
  if (error === 'wrong_chain')
    return 'wrongChain'
  if (error === 'unsupported_function')
    return 'unsupportedFunction'
  return 'invalidAddress'
}

function looksLikePaymentInput(raw: string): boolean {
  const value = raw.trim()
  return value.toLowerCase().startsWith('ethereum:')
    || /^https?:\/\//i.test(value)
    || value.startsWith('/pay?')
    || /^0x[0-9a-fA-F]{40}$/.test(value)
}

function applyRecipientIfPaymentInput() {
  if (looksLikePaymentInput(recipient.value))
    void applyPaymentInput(recipient.value)
}

function onRecipientPaste(event: ClipboardEvent) {
  const raw = event.clipboardData?.getData('text')
  if (!raw || !looksLikePaymentInput(raw))
    return
  event.preventDefault()
  recipient.value = raw
  void applyPaymentInput(raw)
}

async function onSend() {
  localError.value = undefined
  if (!account.address) {
    await open()
    return
  }
  if (!parsedRecipient.value) {
    localError.value = 'invalidAddress'
    return
  }
  if (parsedAmount.value === undefined) {
    localError.value = 'invalidAmount'
    return
  }
  if (insufficientGas.value) {
    localError.value = 'insufficientGas'
    return
  }
  if (insufficient.value) {
    localError.value = asset.value === 'usdc' ? 'insufficientUsdc' : 'insufficient'
    return
  }
  if (busy.value)
    return
  const to = parsedRecipient.value
  const amount = amountText.value.endsWith('.') ? amountText.value.slice(0, -1) : amountText.value
  const token = assetLabel.value
  const hash = asset.value === 'usdc'
    ? await sendUsdc(to, parsedAmount.value)
    : await send(to, parsedAmount.value)
  if (!hash)
    return
  success.value = { hash, amount, token, to }
  navigator.vibrate?.(30)
}

/** 完成: clear everything and go home. */
async function onDone() {
  resetForm()
  await navigateTo('/home')
}

/** 再付一笔: same recipient and token, fresh amount. */
function onPayAgain() {
  success.value = undefined
  amountText.value = ''
  localError.value = undefined
  localWarning.value = undefined
  externalPrefill.value = false
}

function resetForm() {
  success.value = undefined
  recipient.value = ''
  amountText.value = ''
  localError.value = undefined
  localWarning.value = undefined
  externalPrefill.value = false
}

function onWindowKey(event: KeyboardEvent) {
  if (success.value || busy.value)
    return
  if (document.activeElement === toField.value)
    return
  if (event.key >= '0' && event.key <= '9') {
    event.preventDefault()
    pressKey(event.key as typeof keys[number])
    return
  }
  if (event.key === '.' || event.key === ',') {
    event.preventDefault()
    pressKey('.')
    return
  }
  if (event.key === 'Backspace') {
    event.preventDefault()
    pressKey('back')
    return
  }
  if (event.key === 'Enter' && externalPrefill.value) {
    event.preventDefault()
    return
  }
  if (event.key === 'Enter' && canPay.value)
    void onSend()
}

onMounted(async () => {
  window.addEventListener('keydown', onWindowKey)
  // Don't carry a stale error from another page (e.g. a failed claim) into pay.
  if (account.status === 'error') {
    account.status = 'idle'
    account.errorMessage = undefined
  }
  const fromQuery = typeof route.query.uri === 'string' ? route.query.uri : undefined
  // Asset detail → /pay?asset=mon|usdc preselects the token (a payment URI below wins).
  const presetAsset = parseAssetParam(route.query.asset)
  if (presetAsset)
    asset.value = presetAsset
  const pending = fromQuery ?? readPendingPayUri()
  if (pending) {
    await applyPaymentInput(pending)
    clearPendingPayUri()
    if (fromQuery)
      await navigateTo({ path: '/pay', query: {} }, { replace: true })
  }
  if (account.address)
    void account.refreshBalances()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKey)
})

watch(() => route.query.asset, (value) => {
  const next = parseAssetParam(value)
  if (next && !success.value)
    setAsset(next)
})
</script>

<template>
  <!-- Success: replaces the form, same one-screen frame -->
  <div
    v-if="success"
    class="flex h-(--screen-h) max-h-(--screen-h) flex-col overflow-hidden"
    role="status"
    aria-live="polite"
  >
    <PageHeader :title="t('navPay')" />
    <div class="flex min-h-0 flex-1 flex-col items-center justify-center text-center">
      <div class="inline-flex size-16 items-center justify-center rounded-full bg-[#16a34a] animate-[pay-pop_0.4s_ease-out]">
        <Check class="size-8 text-white" :stroke-width="2.5" />
      </div>
      <p class="mt-4 text-[15px] font-semibold">
        {{ t('paySuccessTitle') }}
      </p>
      <p class="mt-1 text-[32px] leading-[1.1] font-semibold tracking-[-0.04em] tabular-nums">
        {{ success.amount }}
        <span class="ml-1 text-[14px] font-medium tracking-normal text-[#737373]">{{ success.token }}</span>
      </p>
      <p class="mt-2 text-[13px] text-[#737373]">
        {{ t('paySuccessTo') }}
        <span class="font-mono tabular-nums text-[#0a0a0a]" :title="success.to">{{ shortAddress(success.to) }}</span>
      </p>
      <p v-if="successExplorerHref" class="mt-2 text-[13px]">
        <NuxtLink class="underline" :to="successExplorerHref" external>
          {{ t('explorer') }}
        </NuxtLink>
      </p>
    </div>
    <div class="shrink-0 space-y-2 pt-2">
      <Button
        class="h-10 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90"
        type="button"
        @click="onDone"
      >
        {{ t('payDone') }}
      </Button>
      <Button
        variant="outline"
        class="h-10 w-full border-[#e5e5e5] bg-white shadow-none"
        type="button"
        @click="onPayAgain"
      >
        {{ t('payAgain') }}
      </Button>
    </div>
  </div>

  <form
    v-else
    class="flex h-(--screen-h) max-h-(--screen-h) flex-col overflow-hidden"
    @submit.prevent="onSend"
  >
    <PageHeader :title="t('navPay')" />
    <div class="mt-2 shrink-0 space-y-2">
      <div class="relative">
        <input
          id="pay-recipient"
          ref="toField"
          v-model="recipient"
          class="h-9 w-full min-w-0 rounded-2xl bg-[#f5f5f5] pr-10 pl-2.5 text-[13px] leading-[1.4] text-[#0a0a0a] outline-none placeholder:text-[#737373] focus:bg-transparent focus:ring-1 focus:ring-[#e5e5e5]"
          :placeholder="t('payToPlaceholder')"
          :aria-label="t('payTo')"
          autocomplete="off"
          spellcheck="false"
          inputmode="text"
          @blur="applyRecipientIfPaymentInput"
          @keydown.enter.prevent
          @paste="onRecipientPaste"
        >
        <PayScanControl class="absolute inset-y-0 right-0" @detected="applyPaymentInput" />
      </div>

      <div v-if="recentRecipients.length" class="flex gap-1.5 overflow-x-auto pb-0.5">
        <button
          v-for="address in recentRecipients.slice(0, 4)"
          :key="address"
          type="button"
          class="h-7 shrink-0 rounded-xl bg-[#f5f5f5] px-2.5 text-[12px] text-[#0a0a0a]"
          :title="address"
          @click="recipient = address"
        >
          {{ shortAddress(address) }}
        </button>
      </div>

      <div class="flex items-end justify-between gap-3">
        <div class="flex gap-1.5">
          <button
            type="button"
            class="h-8 rounded-xl px-3 text-[12px] font-medium"
            :class="asset === 'usdc' ? 'bg-[#0a0a0a] text-[#fafafa]' : 'bg-[#f5f5f5] text-[#737373]'"
            @click="setAsset('usdc')"
          >
            {{ IS_MOCK_USDC ? 'mUSDC' : 'USDC' }}
          </button>
          <button
            type="button"
            class="h-8 rounded-xl px-3 text-[12px] font-medium"
            :class="asset === 'mon' ? 'bg-[#0a0a0a] text-[#fafafa]' : 'bg-[#f5f5f5] text-[#737373]'"
            @click="setAsset('mon')"
          >
            MON
          </button>
        </div>
        <p class="min-w-0 text-right text-[32px] leading-[1.1] font-semibold tracking-[-0.04em] tabular-nums">
          <span :class="amountText ? 'text-[#0a0a0a]' : 'text-[#737373]'">{{ amountText || '0' }}</span>
          <span class="ml-1 text-[13px] font-medium tracking-normal text-[#737373]">{{ assetLabel }}</span>
        </p>
      </div>

      <div class="flex gap-1.5" role="group" :aria-label="t('payQuickAmounts')">
        <button
          v-for="chip in percentChips"
          :key="chip.percent"
          type="button"
          class="h-7 min-w-0 flex-1 rounded-full border px-2 text-[12px] font-medium tabular-nums transition-colors disabled:opacity-40"
          :class="chip.amount !== undefined && amountText === chip.amount
            ? 'border-[#0a0a0a] bg-[#0a0a0a] text-[#fafafa]'
            : 'border-[#e5e5e5] bg-white text-[#0a0a0a]'"
          :disabled="!amountChipsEnabled"
          @click="applyPercent(chip.percent)"
        >
          {{ chip.label }}
        </button>
        <button
          type="button"
          class="h-7 min-w-0 flex-1 rounded-full border px-2 text-[12px] font-medium transition-colors disabled:opacity-40"
          :class="isMaxActive
            ? 'border-[#0a0a0a] bg-[#0a0a0a] text-[#fafafa]'
            : 'border-[#e5e5e5] bg-white text-[#0a0a0a]'"
          :disabled="!amountChipsEnabled"
          @click="applyMax"
        >
          {{ t('payMax') }}
        </button>
      </div>
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

    <div class="mt-auto shrink-0 space-y-1 pt-2">
      <p
        v-if="statusLine"
        class="truncate text-[12px] leading-[1.33]"
        :class="statusTone === 'error' ? 'text-[#e7000b]' : 'text-[#737373]'"
      >
        <template v-if="localError || account.errorMessage">{{ t(localError || account.errorMessage || '') }}</template>
        <template v-else-if="insufficientGas">
          <ClaimMonInline :prefix="t('insufficientGasShort')" />
        </template>
        <template v-else-if="insufficient">{{ t(asset === 'usdc' ? 'insufficientUsdc' : 'insufficient') }}</template>
        <template v-else-if="localWarning">{{ t(localWarning) }}</template>
        <template v-else-if="account.balanceWei === 0n">
          <ClaimMonInline :prefix="t('faucetNeed')" />
        </template>
      </p>

      <Button
        v-if="!account.address"
        class="h-10 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90"
        type="button"
        :disabled="account.status === 'opening'"
        @click="open"
      >
        {{ account.status === 'opening' ? t('opening') : t('start') }}
      </Button>
      <Button
        v-else
        class="h-10 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90"
        type="submit"
        :disabled="!canPay || busy"
      >
        {{ busy ? busyLabel : t('send') }}
      </Button>
    </div>
  </form>
</template>

<style scoped>
@keyframes pay-pop {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  60% {
    opacity: 1;
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
  }
}
</style>
