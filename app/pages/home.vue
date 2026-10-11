<script setup lang="ts">
import { ChevronRight, QrCode, Send, Settings } from '@lucide/vue'
import type { AssetId } from '~/lib/assets'
import { assetMeta, formatTokenAmount } from '~/lib/assets'
import { formatUnitPrice, formatUsd, portfolioUsd, USDC_USD_PRICE } from '~/lib/price'
import { IS_MOCK_USDC } from '~/lib/tokens'

const { t } = useI18n()
const account = useAccountStore()

definePageMeta({
  layout: 'shell',
})

const portfolio = computed(() => portfolioUsd({
  monWei: account.balanceWei,
  usdcBase: account.usdcBase,
  monPriceUsd: account.monPriceUsd,
}))

const loaded = computed(() => account.balanceWei !== undefined || account.usdcBase !== undefined)

interface AssetRow {
  id: AssetId
  symbol: string
  name: string
  slug: string
  amount: string
  usd: string
  unitPrice: string
}

const rows = computed<AssetRow[]>(() => {
  const ids: AssetId[] = ['usdc', 'mon']
  return ids.map((id) => {
    const meta = assetMeta(id, IS_MOCK_USDC)
    const base = id === 'mon' ? account.balanceWei : account.usdcBase
    const usd = id === 'mon' ? portfolio.value.monUsd : portfolio.value.usdcUsd
    const price = id === 'mon' ? account.monPriceUsd : USDC_USD_PRICE
    return {
      id,
      symbol: meta.symbol,
      name: meta.name,
      slug: meta.slug,
      amount: base === undefined ? '—' : formatTokenAmount(base, meta.decimals),
      usd: base === undefined ? '—' : formatUsd(usd),
      unitPrice: formatUnitPrice(price),
    }
  })
})

onMounted(() => {
  void account.refreshBalances()
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <header class="flex h-10 items-center justify-between gap-3">
      <AccountChip />
      <NuxtLink
        to="/settings"
        class="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-[#737373] transition-colors hover:bg-black/5 hover:text-[#0a0a0a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
        :aria-label="t('navSettings')"
      >
        <Settings class="size-5" :stroke-width="1.75" />
      </NuxtLink>
    </header>

    <!-- Total -->
    <section class="px-1 pt-2">
      <p class="text-[13px] leading-[1.4] text-[#737373]">
        {{ t('homeTotal') }} · {{ portfolio.includesMon ? t('homeTotalApprox') : t('homeTotalNoMon') }}
      </p>
      <p class="mt-1 text-[40px] leading-[1.1] font-semibold tracking-[-0.035em] tabular-nums">
        {{ loaded ? formatUsd(portfolio.total) : '—' }}
      </p>
    </section>

    <!-- Quick actions -->
    <div class="grid grid-cols-2 gap-2">
      <NuxtLink
        to="/checkout"
        class="flex h-12 items-center justify-center gap-2 rounded-[18px] bg-[#0a0a0a] text-[14px] font-medium text-[#fafafa] transition-opacity hover:opacity-90"
      >
        <QrCode class="size-4" :stroke-width="2" />
        {{ t('receive') }}
      </NuxtLink>
      <NuxtLink
        to="/pay"
        class="flex h-12 items-center justify-center gap-2 rounded-[18px] border border-[#e5e5e5] bg-white text-[14px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#fafafa]"
      >
        <Send class="size-4" :stroke-width="2" />
        {{ t('navPay') }}
      </NuxtLink>
    </div>

    <!-- Assets -->
    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-2 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="px-3 pt-2 pb-1 text-[13px] font-medium text-[#737373]">
        {{ t('assets') }}
      </h2>
      <ul>
        <li v-for="row in rows" :key="row.id">
          <NuxtLink
            :to="`/asset/${row.slug}`"
            class="flex items-center gap-3 rounded-[18px] px-3 py-3 transition-colors hover:bg-[#f5f5f5] active:bg-[#f0f0f0]"
          >
            <TokenIcon :asset="row.id" />
            <div class="min-w-0 flex-1">
              <p class="text-[15px] leading-[1.35] font-medium">
                {{ row.symbol }}
              </p>
              <p class="truncate text-[12px] leading-[1.4] text-[#737373]">
                {{ row.name }} · {{ row.unitPrice }}
              </p>
            </div>
            <div class="text-right">
              <p class="text-[15px] leading-[1.35] font-medium tabular-nums">
                {{ row.amount }}
              </p>
              <p class="text-[12px] leading-[1.4] text-[#737373] tabular-nums">
                {{ row.usd }}
              </p>
            </div>
            <ChevronRight class="size-4 shrink-0 text-[#a3a3a3]" :stroke-width="1.75" />
          </NuxtLink>
        </li>
      </ul>
    </section>

    <!-- New user: Step 1 MON (gas) → Step 2 mUSDC. Otherwise just top up MON when low. -->
    <OnboardingCard v-if="IS_MOCK_USDC" />
    <ClaimMonCard v-if="!IS_MOCK_USDC || (account.usdcBase ?? 0n) > 0n" />
  </div>
</template>
