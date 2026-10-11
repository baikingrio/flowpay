<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight, ChevronRight, ExternalLink, QrCode, Send } from '@lucide/vue'
import { shortTxHash } from '~/lib/activity'
import { assetActivity, assetMeta, formatTokenAmount, parseAssetParam } from '~/lib/assets'
import { readCheckoutLedger } from '~/lib/checkout-ledger'
import { shortAddress } from '~/lib/format'
import { formatUnitPrice, formatUsd, USDC_USD_PRICE, usdValue } from '~/lib/price'
import { IS_MOCK_USDC } from '~/lib/tokens'

const { t, locale } = useI18n()
const route = useRoute()
const account = useAccountStore()

definePageMeta({
  layout: 'shell',
})

const assetId = computed(() => parseAssetParam(route.params.symbol))
const meta = computed(() => assetMeta(assetId.value ?? 'usdc', IS_MOCK_USDC))
const balance = computed(() => assetId.value === 'mon' ? account.balanceWei : account.usdcBase)
const price = computed(() => assetId.value === 'mon' ? account.monPriceUsd : USDC_USD_PRICE)
const usd = computed(() => usdValue(balance.value, meta.value.decimals, price.value))

const ledgerTick = ref(0)
const items = computed(() => {
  void ledgerTick.value
  if (!assetId.value || !account.address)
    return []
  return assetActivity(assetId.value, account.activity, readCheckoutLedger(account.address))
})

const explorerBase = 'https://testnet.monadexplorer.com/tx/'

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(locale.value, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(() => {
  if (!assetId.value) {
    void navigateTo('/home', { replace: true })
    return
  }
  ledgerTick.value++
  void account.refreshBalances()
})
// Balance refresh usually means a new receipt/send landed; re-read local ledger too.
watch(() => account.balancesUpdatedAt, () => {
  ledgerTick.value++
})
</script>

<template>
  <div v-if="assetId" class="flex flex-col gap-5">
    <PageHeader :title="meta.symbol" back="/home" />

    <section class="flex flex-col items-center px-1 pt-1 text-center">
      <TokenIcon :asset="assetId" size="lg" />
      <p class="mt-3 text-[36px] leading-[1.1] font-semibold tracking-[-0.035em] tabular-nums">
        {{ balance === undefined ? '—' : formatTokenAmount(balance, meta.decimals, 6) }}
        <span class="text-[15px] font-medium tracking-normal text-[#737373]">{{ meta.symbol }}</span>
      </p>
      <p class="mt-1 text-[15px] text-[#737373] tabular-nums">
        {{ balance === undefined ? '—' : formatUsd(usd) }}
      </p>
      <p class="mt-1 text-[12px] text-[#a3a3a3]">
        <template v-if="price !== undefined">
          1 {{ meta.symbol }} ≈ {{ formatUnitPrice(price) }}<template v-if="assetId === 'mon'">
            · {{ t('assetRefPrice') }}
          </template>
        </template>
        <template v-else>
          {{ t('assetPriceUnavailable') }}
        </template>
      </p>
    </section>

    <div class="grid grid-cols-2 gap-2">
      <NuxtLink
        :to="{ path: '/checkout', query: { asset: assetId } }"
        class="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] transition-opacity hover:opacity-90"
      >
        <QrCode class="size-4" :stroke-width="2" />
        {{ t('receive') }}
      </NuxtLink>
      <NuxtLink
        :to="{ path: '/pay', query: { asset: assetId } }"
        class="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[#e5e5e5] bg-white text-[14px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#fafafa]"
      >
        <Send class="size-4" :stroke-width="2" />
        {{ t('navPay') }}
      </NuxtLink>
    </div>

    <ClaimMusdcCard v-if="assetId === 'usdc'" />

    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-2 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <div class="flex items-center justify-between px-3 pt-2 pb-1">
        <h2 class="text-[13px] font-medium text-[#737373]">
          {{ t('assetActivity') }}
        </h2>
        <NuxtLink to="/receipts" class="inline-flex items-center gap-0.5 text-[12px] text-[#737373] hover:text-[#0a0a0a]">
          {{ t('receipts') }}
          <ChevronRight class="size-3.5" :stroke-width="1.75" />
        </NuxtLink>
      </div>
      <ul v-if="items.length">
        <li
          v-for="(item, index) in items"
          :key="`${item.hash ?? 'nohash'}-${item.at}-${index}`"
          class="flex items-center gap-3 px-3 py-2.5"
        >
          <span
            class="inline-flex size-9 shrink-0 items-center justify-center rounded-full"
            :class="item.kind === 'received' ? 'bg-[#dcfce7] text-[#16a34a]' : 'bg-[#f5f5f5] text-[#0a0a0a]'"
            aria-hidden="true"
          >
            <ArrowDownLeft v-if="item.kind === 'received'" class="size-4" :stroke-width="2" />
            <ArrowUpRight v-else class="size-4" :stroke-width="2" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-[14px] leading-[1.4] font-medium">
              <template v-if="item.kind === 'received'">
                {{ t('assetReceived') }}
              </template>
              <template v-else>
                {{ t('assetSentTo', { to: item.counterparty ? shortAddress(item.counterparty) : '—' }) }}
              </template>
            </p>
            <p class="text-[12px] leading-[1.4] text-[#737373]">
              {{ formatTime(item.at) }}
            </p>
          </div>
          <div class="flex flex-col items-end">
            <p
              class="text-[14px] leading-[1.4] font-medium tabular-nums"
              :class="item.kind === 'received' ? 'text-[#16a34a]' : 'text-[#0a0a0a]'"
            >
              {{ item.kind === 'received' ? '+' : '−' }}{{ formatTokenAmount(item.amountBase, meta.decimals, 6) }}
            </p>
            <NuxtLink
              v-if="item.hash"
              :to="`${explorerBase}${item.hash}`"
              external
              class="inline-flex items-center gap-0.5 text-[12px] leading-[1.4] text-[#737373] hover:text-[#0a0a0a]"
            >
              {{ shortTxHash(item.hash) }}
              <ExternalLink class="size-3" :stroke-width="1.75" />
            </NuxtLink>
          </div>
        </li>
      </ul>
      <p v-else class="px-3 pt-1 pb-3 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('assetActivityEmpty') }}
      </p>
      <p class="px-3 pb-2 text-[11px] leading-[1.4] text-[#a3a3a3]">
        {{ t('assetActivityNote') }}
      </p>
    </section>
  </div>
</template>
