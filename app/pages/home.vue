<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { FAUCET_URL } from '~/lib/chain'
import { shortTxHash } from '~/lib/activity'
import { shortAddress } from '~/lib/format'
import { formatMon } from '~/lib/ledger'

const { t } = useI18n()
const router = useRouter()
const account = useAccountStore()
const { signOut } = useSigningSession()
const copied = ref(false)
const showReceive = ref(false)
const showClearConfirm = ref(false)

definePageMeta({
  layout: 'shell',
})

const explorerBase = 'https://testnet.monadexplorer.com/tx/'

async function copyAddress() {
  if (!account.address)
    return
  await navigator.clipboard.writeText(account.address)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1500)
}

function confirmClear() {
  showClearConfirm.value = true
}

function cancelClear() {
  showClearConfirm.value = false
}

function handleClear() {
  signOut()
  showClearConfirm.value = false
  void router.replace('/')
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && showClearConfirm.value) {
    cancelClear()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="flex flex-col gap-8">
    <div>
      <h1 class="text-[36px] leading-[1.11] font-semibold tracking-[-0.025em]">
        <template v-if="account.balanceWei === undefined">
          —
        </template>
        <template v-else>
          {{ formatMon(account.balanceWei) }}
          <span class="text-[18px] font-medium tracking-normal text-[#737373]">MON</span>
        </template>
      </h1>
      <p class="mt-3 text-[14px] leading-[1.43] text-[#737373]">
        {{ account.address ? shortAddress(account.address) : '' }}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <Button
        class="w-full"
        :aria-expanded="showReceive"
        @click="showReceive = !showReceive"
      >
        {{ showReceive ? t('hideReceive') : t('receive') }}
      </Button>
      <Button variant="outline" class="w-full border-[#e5e5e5] bg-white shadow-none" @click="copyAddress">
        {{ copied ? t('copied') : t('copy') }}
      </Button>
      <NuxtLink
        v-if="account.balanceWei === 0n"
        class="flex h-10 items-center justify-center rounded-[18px] border border-[#e5e5e5] bg-white text-[14px] font-medium"
        :to="FAUCET_URL"
        external
      >
        {{ t('faucet') }}
      </NuxtLink>
    </div>

    <PayReceivePanel
      v-if="showReceive && account.address"
      :address="account.address"
    />

    <p v-if="account.balanceWei === 0n" class="text-[14px] leading-[1.43] text-[#737373]">
      {{ t('faucetNeed') }}
    </p>

    <section class="rounded-[24px] border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
      <h2 class="text-[18px] leading-[1.56] font-medium">
        {{ t('history') }}
      </h2>
      <p class="mt-1 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('historyLocal') }}
      </p>

      <ul v-if="account.activity.length > 0" class="mt-4 flex flex-col gap-3">
        <li
          v-for="item in account.activity"
          :key="item.hash"
          class="flex items-start justify-between gap-3 text-[14px] leading-[1.43]"
        >
          <div class="min-w-0">
            <p class="font-medium tabular-nums text-[#0a0a0a]">
              −{{ formatMon(BigInt(item.valueWei)) }} MON
            </p>
            <p class="mt-0.5 truncate text-[#737373]">
              {{ t('payTo') }} {{ shortAddress(item.to) }}
            </p>
          </div>
          <NuxtLink
            class="shrink-0 underline"
            :to="`${explorerBase}${item.hash}`"
            external
          >
            {{ shortTxHash(item.hash) }}
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="mt-4 text-[14px] leading-[1.43] text-[#737373]">
        {{ t('historyEmpty') }}
      </p>
    </section>

    <div class="flex justify-center pt-4">
      <button
        type="button"
        class="text-[14px] leading-[1.43] text-[#737373] underline hover:text-[#0a0a0a]"
        @click="confirmClear"
      >
        {{ t('clearLocal') }}
      </button>
    </div>

    <div
      v-if="showClearConfirm"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5"
      @click.self="cancelClear"
    >
      <div
        class="w-full max-w-[320px] rounded-[24px] bg-white p-6 shadow-lg"
        role="dialog"
        aria-modal="true"
      >
        <p class="text-[16px] leading-[1.5] text-[#0a0a0a]">
          {{ t('clearLocalConfirm') }}
        </p>
        <div class="mt-6 flex gap-3">
          <Button
            variant="outline"
            class="flex-1 border-[#e5e5e5] bg-white shadow-none"
            @click="cancelClear"
          >
            {{ t('clearCancel') }}
          </Button>
          <Button
            class="flex-1"
            @click="handleClear"
          >
            {{ t('clearButton') }}
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
