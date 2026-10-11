<script setup lang="ts">
import type { AssetId } from '~/lib/assets'

withDefaults(defineProps<{
  asset: AssetId
  size?: 'md' | 'lg'
}>(), { size: 'md' })
</script>

<template>
  <span
    class="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
    :class="[
      size === 'lg' ? 'size-14 text-[22px]' : 'size-10 text-[16px]',
      asset === 'mon' ? 'bg-[#836ef9]' : 'bg-[#2775ca]',
    ]"
    aria-hidden="true"
  >
    {{ asset === 'mon' ? 'M' : '$' }}
  </span>
</template>
