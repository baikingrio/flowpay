<script setup lang="ts">
import { ChevronLeft } from '@lucide/vue'

/** Simple page title row. `back` = fallback route; prefers real history when there is one. */
const props = defineProps<{
  title?: string
  back?: string
}>()

const { t } = useI18n()
const router = useRouter()

function goBack() {
  const state = typeof window !== 'undefined' ? window.history.state as { back?: string | null } | null : null
  if (state?.back)
    router.back()
  else
    void navigateTo(props.back ?? '/home', { replace: true })
}
</script>

<template>
  <header class="flex h-10 shrink-0 items-center gap-1">
    <button
      v-if="back"
      type="button"
      class="-ml-2 inline-flex size-10 items-center justify-center rounded-full text-[#0a0a0a] transition-colors hover:bg-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
      :aria-label="t('back')"
      @click="goBack"
    >
      <ChevronLeft class="size-6" :stroke-width="1.75" />
    </button>
    <h1 v-if="title" class="min-w-0 flex-1 truncate text-[20px] leading-[1.2] font-semibold tracking-[-0.02em]">
      {{ title }}
    </h1>
    <div v-else class="flex-1" />
    <slot name="right" />
  </header>
</template>
