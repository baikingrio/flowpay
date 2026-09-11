<script setup lang="ts">
import { Delete } from '@lucide/vue'
import { isAddress, parseEther, type Address } from 'viem'
import { Button } from '@/components/ui/button'
import { FAUCET_URL, FIRST_PAYMENT_TO, FIRST_PAYMENT_VALUE, isFirstPaymentDefaults } from '~/lib/chain'
import { parsePaymentUri, type ParsePaymentUriFailure } from '~/lib/eip681'
import { resolveEnsName } from '~/lib/ens'
import { shortAddress } from '~/lib/format'
import { formatMon } from '~/lib/ledger'
import { clearPendingPayUri, readPendingPayUri } from '~/lib/pending-pay-uri'

const { t } = useI18n()
const route = useRoute()
const account = useAccountStore()
const { open, send } = useSigningSession()

definePageMeta({
  layout: 'shell',
})

const recipient = ref<string>(FIRST_PAYMENT_TO)
const amountText = ref(formatMon(FIRST_PAYMENT_VALUE))
const localError = ref<string | undefined>()
const localWarning = ref<string | undefined>()
const externalPrefill = ref(false)
const toField = ref<HTMLInputElement | null>(null)

const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'back'] as const

const parsedAmount = computed(() => parseAmountText(amountText.value))
const parsedRecipient = computed(() => {
  const value = recipient.value.trim()
  if (!isAddress(value))
    return undefined
  return value as Address
})
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
const explorerHref = computed(() =>
  account.lastTxHash
    ? `https://testnet.monadexplorer.com/tx/${account.lastTxHash}`
    : undefined,
)
const insufficient = computed(() =>
  parsedAmount.value !== undefined
  && account.balanceWei !== undefined
  && account.balanceWei <= parsedAmount.value,
)
const canPay = computed(() =>
  account.hasSession
  && parsedRecipient.value !== undefined
  && parsedAmount.value !== undefined
  && account.balanceWei !== undefined
  && account.balanceWei > parsedAmount.value,
)

const isFirstPayment = computed(() =>
  isFirstPaymentDefaults(recipient.value, parsedAmount.value),
)

function parseAmountText(raw: string): bigint | undefined {
  const cleaned = raw.endsWith('.') ? raw.slice(0, -1) : raw
  if (!cleaned || cleaned === '.')
    return undefined
  try {
    const value = parseEther(cleaned)
    return value > 0n ? value : undefined
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
  if (parsed.valueWei !== undefined)
    amountText.value = formatMon(parsed.valueWei)
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
  if (!account.hasSession) {
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
  if (insufficient.value) {
    localError.value = 'insufficient'
    return
  }
  await send(parsedRecipient.value, parsedAmount.value)
}

function onWindowKey(event: KeyboardEvent) {
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
  const fromQuery = typeof route.query.uri === 'string' ? route.query.uri : undefined
  const pending = fromQuery ?? readPendingPayUri()
  if (pending) {
    await applyPaymentInput(pending)
    clearPendingPayUri()
    if (fromQuery)
      await navigateTo({ path: '/pay', query: {} }, { replace: true })
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKey)
})
</script>

<template>
  <form class="flex min-h-[calc(100dvh-160px)] flex-col" @submit.prevent="onSend">
    <div class="flex-1">
      <div>
        <label for="pay-recipient" class="mb-2 block text-[14px] leading-[1.43] text-[#737373]">
          {{ t('payTo') }}
        </label>
        <span class="flex gap-2">
          <input
            id="pay-recipient"
            ref="toField"
            v-model="recipient"
            class="h-10 min-w-0 flex-1 rounded-[18px] bg-[#f5f5f5] px-2.5 text-[14px] leading-[1.43] text-[#0a0a0a] outline-none placeholder:text-[#737373] focus:bg-transparent focus:ring-1 focus:ring-[#e5e5e5]"
            :placeholder="t('payToPlaceholder')"
            autocomplete="off"
            spellcheck="false"
            inputmode="text"
            @blur="applyRecipientIfPaymentInput"
            @keydown.enter.prevent
            @paste="onRecipientPaste"
          >
          <PayScanControl @detected="applyPaymentInput" />
        </span>
      </div>

      <div v-if="recentRecipients.length" class="mt-4">
        <p class="mb-2 text-[13px] leading-[1.4] text-[#737373]">
          {{ t('recentRecipients') }}
        </p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="address in recentRecipients"
            :key="address"
            type="button"
            class="h-8 rounded-2xl bg-[#f5f5f5] px-3 text-[13px] text-[#0a0a0a] hover:bg-[#ececec]"
            :title="address"
            @click="recipient = address"
          >
            {{ shortAddress(address) }}
          </button>
        </div>
      </div>

      <p class="mt-8 text-[48px] leading-[1.1] font-semibold tracking-[-0.05em] tabular-nums">
        <span :class="amountText ? 'text-[#0a0a0a]' : 'text-[#737373]'">
          {{ amountText || '0' }}
        </span>
        <span class="ml-2 text-[18px] font-medium tracking-normal text-[#737373]">MON</span>
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

      <p v-if="account.balanceWei === 0n" class="mt-4 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('faucetNeed') }}
      </p>
      <NuxtLink
        v-if="account.balanceWei === 0n"
        class="mt-2 inline-flex h-10 items-center text-[14px] underline"
        :to="FAUCET_URL"
        external
      >
        {{ t('faucet') }}
      </NuxtLink>
      <p v-if="isFirstPayment && !externalPrefill" class="mt-4 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('firstPaymentHint') }}
      </p>
      <p v-else-if="insufficient" class="mt-4 text-[14px] leading-[1.43] text-[#e7000b]">
        {{ t('insufficient') }}
      </p>
      <p v-if="account.lastTxHash && explorerHref" class="mt-4 text-[14px] leading-[1.43]">
        {{ t('sent') }}
        <NuxtLink class="underline" :to="explorerHref" external>
          {{ t('explorer') }}
        </NuxtLink>
        <span v-if="account.usedSponsorship" class="ml-2 text-[#737373]">
          ({{ t('sponsored') }})
        </span>
      </p>
      <p v-if="account.sessionExpired && !account.hasSession" class="mt-4 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('sessionExpiredPrompt') }}
      </p>
      <p v-if="localWarning" class="mt-4 text-[14px] leading-[1.43] text-[#737373]">
        {{ t(localWarning) }}
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
      type="submit"
      :disabled="!canPay || account.status === 'sending'"
    >
      {{ account.status === 'sending' ? t('sending') : t('send') }}
    </Button>
  </form>
</template>
