<script setup lang="ts">
import { Check, Copy } from '@lucide/vue'
import { shortAddress } from '~/lib/format'

const { t } = useI18n()
const account = useAccountStore()
const copied = ref(false)

/** Deterministic two-tone avatar from the address. */
const avatarStyle = computed(() => {
  const hex = (account.address ?? '0x000000000000').slice(2)
  const h1 = Number.parseInt(hex.slice(0, 6), 16) % 360
  const h2 = (h1 + 60 + (Number.parseInt(hex.slice(6, 10), 16) % 120)) % 360
  return { background: `linear-gradient(135deg, hsl(${h1} 70% 60%), hsl(${h2} 70% 50%))` }
})

async function copyAddress() {
  if (!account.address)
    return
  await navigator.clipboard.writeText(account.address)
  copied.value = true
  window.setTimeout(() => {
    copied.value = false
  }, 1500)
}
</script>

<template>
  <button
    v-if="account.address"
    type="button"
    class="inline-flex h-10 min-w-0 items-center gap-2 rounded-full bg-white py-1 pr-3 pl-1 text-[13px] text-[#0a0a0a] shadow-[0_0_0_1px_rgba(23,23,23,0.06),0_1px_2px_rgba(0,0,0,0.06)] transition-colors hover:bg-[#fafafa] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
    :aria-label="copied ? t('copied') : t('copy')"
    :title="account.address"
    @click="copyAddress"
  >
    <span class="size-8 shrink-0 rounded-full" :style="avatarStyle" aria-hidden="true" />
    <span class="font-mono tabular-nums">{{ shortAddress(account.address) }}</span>
    <Check v-if="copied" class="size-3.5 text-[#16a34a]" :stroke-width="2" />
    <Copy v-else class="size-3.5 text-[#737373]" :stroke-width="1.75" />
  </button>
</template>
