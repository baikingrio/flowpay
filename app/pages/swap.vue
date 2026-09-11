<script setup lang="ts">
import { Button } from '@/components/ui/button'

const { t } = useI18n()

definePageMeta({
  layout: 'shell',
})
</script>

<template>
  <div class="flex min-h-[calc(100dvh-160px)] flex-col">
    <div class="flex-1">
      <h1 class="text-[36px] leading-[1.11] font-semibold tracking-[-0.025em]">
        {{ t('navSwap') }}
      </h1>
      <p class="mt-4 text-[18px] leading-[1.56] font-medium">
        MON → {{ t('swapToken') }}
      </p>
      <p class="mt-3 max-w-[36ch] text-[14px] leading-[1.43] text-[#737373]">
        {{ t('swapSoon') }}
      </p>
    </div>
    <Button class="h-11 w-full text-[14px] font-medium" disabled>
      {{ t('swapSoonAction') }}
    </Button>
  </div>
</template>
