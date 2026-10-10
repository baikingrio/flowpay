<script setup lang="ts">
import { Delete } from '@lucide/vue'
import { isAddress, parseEther, type Address } from 'viem'
import { Button } from '@/components/ui/button'
import { FAUCET_URL } from '~/lib/chain'
import { parsePaymentUri, type ParsePaymentUriFailure } from '~/lib/eip681'
import { resolveEnsName } from '~/lib/ens'
import { shortAddress } from '~/lib/format'
import { formatMon } from '~/lib/ledger'
import { clearPendingPayUri, readPendingPayUri } from '~/lib/pending-pay-uri'
import { IS_MOCK_USDC, USDC_ADDRESS } from '~/lib/tokens'
import { formatUsdcFromBase, parseUsdcToBase } from '~/lib/usdc-amount'

const { t } = useI18n()
const route = useRoute()
const account = useAccountStore()
const { open, send, sendUsdc, getUsdcBalance } = useSigningSession()

type Asset = 'mon' | 'usdc'

definePageMeta({
  layout: 'shell',
})

const recipient = ref('')
const amountText = ref('')
const asset = ref<Asset>('usdc')
const usdcBalance = ref<bigint>(0n)
const localError = ref<string | undefined>()
const localWarning = ref<string | undefined>()
const externalPrefill = ref(false)
const toField = ref<HTMLInputElement | null>(null)

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
const explorerHref = computed(() =>
  account.lastTxHash
    ? `https://testnet.monadexplorer.com/tx/${account.lastTxHash}`
    : undefined,
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
  if (!account.hasSession || parsedRecipient.value === undefined || parsedAmount.value === undefined)
    return false
  if (asset.value === 'usdc')
    return usdcBalance.value >= parsedAmount.value && account.balanceWei !== undefined && account.balanceWei > 0n
  return account.balanceWei !== undefined && account.balanceWei > parsedAmount.value
})


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

  if (parsed.tokenAddress && parsed.tokenAmount !== undefined) {
    if (parsed.tokenAddress.toLowerCase() !== USDC_ADDRESS.toLowerCase()) {
      localError.value = 'unsupportedToken'
      return
    }
    asset.value = 'usdc'
    amountText.value = formatUsdcFromBase(parsed.tokenAmount)
  }
  else if (parsed.valueWei !== undefined) {
    asset.value = 'mon'
    amountText.value = formatMon(parsed.valueWei)
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
  if (insufficientGas.value) {
    localError.value = 'insufficientGas'
    return
  }
  if (insufficient.value) {
    localError.value = asset.value === 'usdc' ? 'insufficientUsdc' : 'insufficient'
    return
  }
  if (asset.value === 'usdc')
    await sendUsdc(parsedRecipient.value, parsedAmount.value)
  else
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
  if (account.hasSession)
    usdcBalance.value = await getUsdcBalance()
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onWindowKey)
})

watch(() => account.hasSession, async (hasSession) => {
  if (hasSession)
    usdcBalance.value = await getUsdcBalance()
  else
    usdcBalance.value = 0n
})
</script>

<template>
  <form
    class="flex h-[calc(100dvh-160px)] max-h-[calc(100dvh-160px)] flex-col overflow-hidden"
    @submit.prevent="onSend"
  >
    <div class="shrink-0 space-y-2">
      <div class="flex gap-2">
        <input
          id="pay-recipient"
          ref="toField"
          v-model="recipient"
          class="h-9 min-w-0 flex-1 rounded-2xl bg-[#f5f5f5] px-2.5 text-[13px] leading-[1.4] text-[#0a0a0a] outline-none placeholder:text-[#737373] focus:bg-transparent focus:ring-1 focus:ring-[#e5e5e5]"
          :placeholder="t('payToPlaceholder')"
          autocomplete="off"
          spellcheck="false"
          inputmode="text"
          :aria-label="t('payTo')"
          @blur="applyRecipientIfPaymentInput"
          @keydown.enter.prevent
          @paste="onRecipientPaste"
        >
        <PayScanControl @detected="applyPaymentInput" />
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
    </div>

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

    <div class="mt-2 shrink-0 space-y-1">
      <p
        v-if="localError || account.errorMessage || insufficient || insufficientGas || localWarning || (account.lastTxHash && explorerHref) || (account.sessionExpired && !account.hasSession) || account.balanceWei === 0n"
        class="truncate text-[12px] leading-[1.33]"
        :class="(localError || account.errorMessage || insufficient || insufficientGas) ? 'text-[#e7000b]' : 'text-[#737373]'"
      >
        <template v-if="localError || account.errorMessage">{{ t(localError || account.errorMessage || '') }}</template>
        <template v-else-if="insufficientGas">{{ t('insufficientGas') }}</template>
        <template v-else-if="insufficient">{{ t(asset === 'usdc' ? 'insufficientUsdc' : 'insufficient') }}</template>
        <template v-else-if="localWarning">{{ t(localWarning) }}</template>
        <template v-else-if="account.lastTxHash && explorerHref">
          {{ t('sent') }}
          <NuxtLink class="underline" :to="explorerHref" external>{{ t('explorer') }}</NuxtLink>
        </template>
        <template v-else-if="account.sessionExpired && !account.hasSession">{{ t('sessionExpiredPrompt') }}</template>
        <template v-else-if="account.balanceWei === 0n">
          {{ t('faucetNeed') }}
          <NuxtLink class="underline" :to="FAUCET_URL" external>{{ t('faucet') }}</NuxtLink>
        </template>
      </p>

      <Button
        v-if="!account.hasSession"
        class="h-10 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90"
        type="button"
        :disabled="account.status === 'opening'"
        @click="open"
      >
        {{ account.status === 'opening' ? t('opening') : account.sessionExpired ? t('continue') : t('start') }}
      </Button>
      <Button
        v-else
        class="h-10 w-full bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] hover:bg-[#0a0a0a]/90"
        type="submit"
        :disabled="!canPay || account.status === 'sending'"
      >
        {{ account.status === 'sending' ? t('sending') : t('send') }}
      </Button>
    </div>
  </form>
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
      <p v-if="insufficientGas" class="mt-4 text-[14px] leading-[1.43] text-[#e7000b]">
        {{ t('insufficientGas') }}
      </p>
      <p v-else-if="insufficient" class="mt-4 text-[14px] leading-[1.43] text-[#e7000b]">
        {{ t(asset === 'usdc' ? 'insufficientUsdc' : 'insufficient') }}
      </p>
      <p v-if="account.lastTxHash && explorerHref" class="mt-4 text-[14px] leading-[1.43]">
        {{ t('sent') }}
        <NuxtLink class="underline" :to="explorerHref" external>
          {{ t('explorer') }}
        </NuxtLink>
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
