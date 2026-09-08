<script setup lang="ts">
import { parseEther } from 'viem'
import { Button } from '@/components/ui/button'
import { buildPaymentUri, toAppPayPath } from '~/lib/eip681'
import { encodeQrDataUrl } from '~/lib/qr-encode'

const props = defineProps<{
  address: `0x${string}`
}>()

const { t } = useI18n()
const requestUrl = useRequestURL()
const amount = ref('')
const qrUrl = ref('')
const copied = ref<'address' | 'uri' | 'link'>()

const amountWei = computed(() => {
  const value = amount.value.trim()
  if (!value)
    return undefined
  try {
    const parsed = parseEther(value)
    return parsed > 0n ? parsed : null
  }
  catch {
    return null
  }
})
const invalidAmount = computed(() => amountWei.value === null)
const paymentUri = computed(() => buildPaymentUri({
  address: props.address,
  valueWei: amountWei.value ?? undefined,
}))
const payLink = computed(() => `${requestUrl.origin}${toAppPayPath(paymentUri.value)}`)

watch(paymentUri, async (uri, _, onCleanup) => {
  let current = true
  onCleanup(() => {
    current = false
  })
  const encoded = await encodeQrDataUrl(uri)
  if (current)
    qrUrl.value = encoded
}, { immediate: true })

async function copy(value: string, kind: 'address' | 'uri' | 'link') {
  await navigator.clipboard.writeText(value)
  copied.value = kind
  window.setTimeout(() => {
    if (copied.value === kind)
      copied.value = undefined
  }, 1500)
}
</script>

<template>
  <section class="rounded-3xl border border-[#e5e5e5] bg-white p-5 shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_-1px_rgba(0,0,0,0.1)]">
    <h2 class="text-[18px] leading-[1.56] font-medium">
      {{ t('receive') }}
    </h2>

    <label class="mt-4 block text-[14px] leading-[1.43]">
      <span class="text-[#737373]">{{ t('receiveAmount') }}</span>
      <input
        v-model="amount"
        class="mt-2 h-10 w-full rounded-[18px] bg-[#f5f5f5] px-3 text-[14px] outline-none focus:ring-1 focus:ring-[#e5e5e5]"
        inputmode="decimal"
        autocomplete="off"
        placeholder="0.0 MON"
      >
    </label>
    <p v-if="invalidAmount" class="mt-2 text-[14px] leading-[1.43] text-[#e7000b]">
      {{ t('invalidAmount') }}
    </p>

    <div class="mt-5 flex justify-center">
      <div class="rounded-3xl border border-[#e5e5e5] bg-white p-3">
        <img
          v-if="!invalidAmount && qrUrl"
          :src="qrUrl"
          :alt="t('receiveQrAlt')"
          width="240"
          height="240"
          class="size-60"
        >
      </div>
    </div>

    <p v-if="!invalidAmount" class="mt-4 break-all text-center text-[14px] leading-[1.43] text-[#737373]">
      {{ paymentUri }}
    </p>

    <div class="mt-5 grid gap-2">
      <Button
        variant="outline"
        class="w-full border-[#e5e5e5] bg-white shadow-none"
        @click="copy(address, 'address')"
      >
        {{ copied === 'address' ? t('copied') : t('copy') }}
      </Button>
      <Button
        variant="outline"
        class="w-full border-[#e5e5e5] bg-white shadow-none"
        :disabled="invalidAmount"
        @click="copy(paymentUri, 'uri')"
      >
        {{ copied === 'uri' ? t('copiedUri') : t('copyUri') }}
      </Button>
      <Button
        variant="outline"
        class="w-full border-[#e5e5e5] bg-white shadow-none"
        :disabled="invalidAmount"
        @click="copy(payLink, 'link')"
      >
        {{ copied === 'link' ? t('copiedLink') : t('copyPayLink') }}
      </Button>
    </div>
  </section>
</template>
