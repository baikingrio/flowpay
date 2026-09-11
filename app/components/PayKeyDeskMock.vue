<script setup lang="ts">
/**
 * Decorative Pay slip for landing (to + amount only).
 * Must not touch account/session stores or send transactions (ADR 0009).
 */
withDefaults(defineProps<{
  compact?: boolean
  captionId?: string
}>(), {
  compact: false,
  captionId: 'pay-mock-caption',
})

const { t } = useI18n()
</script>

<template>
  <figure class="pointer-events-none select-none" :aria-labelledby="captionId">
    <figcaption
      :id="captionId"
      class="mb-3 text-center text-[12px] leading-[1.33] font-medium tracking-[0.05em] text-[#737373] uppercase"
    >
      {{ t('mockIllustration') }}
    </figcaption>
    <div
      class="rounded-[24px] border border-[#e5e5e5] bg-white shadow-[0_0_0_1px_rgba(23,23,23,0.05),0_1px_2px_rgba(0,0,0,0.06)]"
      :class="compact ? 'p-4' : 'p-6'"
      aria-hidden="true"
    >
      <p class="text-[14px] leading-[1.43] text-[#737373]">
        {{ t('payTo') }}
      </p>
      <div
        class="mt-2 flex items-center rounded-[18px] bg-[#f5f5f5] px-2.5 text-[14px] text-[#737373]"
        :class="compact ? 'h-9' : 'h-10'"
      >
        {{ t('mockRecipient') }}
      </div>

      <p
        class="font-semibold tracking-[-0.04em] tabular-nums text-[#737373]"
        :class="compact ? 'mt-6 text-[28px] leading-[1.15]' : 'mt-10 text-[40px] leading-[1.1]'"
      >
        {{ t('mockAmount') }}
        <span
          class="ml-2 font-medium tracking-normal text-[#a3a3a3]"
          :class="compact ? 'text-[14px]' : 'text-[16px]'"
        >MON</span>
      </p>
    </div>
  </figure>
</template>
