<script setup lang="ts">
import { Download, ExternalLink } from '@lucide/vue'
import { shortTxHash } from '~/lib/activity'
import { formatTokenAmount } from '~/lib/assets'
import { downloadCSV, exportReceiptsAsCSV, readCheckoutLedger, receiptToken, summarizeToday } from '~/lib/checkout-ledger'
import type { CheckoutReceipt } from '~/lib/checkout-ledger'
import { formatMon } from '~/lib/ledger'
import { IS_MOCK_USDC } from '~/lib/tokens'
import { formatUsdcFromBase } from '~/lib/usdc-amount'

const { t, locale } = useI18n()
const account = useAccountStore()

definePageMeta({
  layout: 'shell',
})

const usdcLabel = IS_MOCK_USDC ? 'mUSDC' : 'USDC'
const entries = ref<CheckoutReceipt[]>([])
const today = computed(() => summarizeToday(entries.value))
const todayTotalText = computed(() => {
  const parts: string[] = []
  if (today.value.totalBase > 0n || today.value.totalMonWei === 0n)
    parts.push(`${formatUsdcFromBase(today.value.totalBase)} ${usdcLabel}`)
  if (today.value.totalMonWei > 0n)
    parts.push(`${formatMon(today.value.totalMonWei)} MON`)
  return parts.join(' · ')
})

function label(entry: CheckoutReceipt): string {
  const isMon = receiptToken(entry) === 'MON'
  return `+${formatTokenAmount(entry.amountBase, isMon ? 18 : 6, 6)} ${isMon ? 'MON' : usdcLabel}`
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleString(locale.value, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function onExport() {
  if (!entries.value.length)
    return
  const csv = exportReceiptsAsCSV(entries.value, { locale: locale.value })
  const date = new Date().toISOString().split('T')[0]
  downloadCSV(csv, `flowpay-receipts-${date}.csv`)
}

onMounted(() => {
  entries.value = account.address ? readCheckoutLedger(account.address) : []
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <PageHeader :title="t('receipts')" back="/checkout">
      <template #right>
        <button
          v-if="entries.length"
          type="button"
          class="inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[13px] text-[#737373] transition-colors hover:bg-black/5 hover:text-[#0a0a0a]"
          @click="onExport"
        >
          <Download class="size-3.5" :stroke-width="1.75" />
          {{ t('exportCSV') }}
        </button>
      </template>
    </PageHeader>

    <p class="px-1 text-[13px] text-[#737373]">
      <template v-if="today.count > 0">
        {{ t('todayLedgerSummary', { count: today.count, total: todayTotalText }) }}
      </template>
      <template v-else>
        {{ t('todayLedgerEmpty') }}
      </template>
    </p>

    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-2 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <ul v-if="entries.length">
        <li
          v-for="(entry, index) in entries"
          :key="`${entry.hash ?? 'nohash'}-${entry.receivedAt}-${index}`"
          class="flex items-center justify-between gap-3 px-3 py-2.5"
        >
          <div class="min-w-0">
            <p class="text-[14px] leading-[1.4] font-medium text-[#16a34a] tabular-nums">
              {{ label(entry) }}
            </p>
            <p class="text-[12px] leading-[1.4] text-[#737373]">
              {{ formatTime(entry.receivedAt) }}
            </p>
          </div>
          <NuxtLink
            v-if="entry.hash"
            :to="`https://testnet.monadexplorer.com/tx/${entry.hash}`"
            external
            class="inline-flex shrink-0 items-center gap-0.5 text-[12px] text-[#737373] hover:text-[#0a0a0a]"
          >
            {{ shortTxHash(entry.hash) }}
            <ExternalLink class="size-3" :stroke-width="1.75" />
          </NuxtLink>
          <span v-else class="shrink-0 text-[12px] text-[#a3a3a3]">{{ t('receiptNoHash') }}</span>
        </li>
      </ul>
      <p v-else class="px-3 py-3 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('receiptsEmpty') }}
      </p>
    </section>

    <p class="px-1 text-[12px] leading-[1.4] text-[#a3a3a3]">
      {{ t('todayLedgerFootnote') }}
    </p>
  </div>
</template>
