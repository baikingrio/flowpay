<script setup lang="ts">
import { ArrowLeftRight, House, Send } from '@lucide/vue'

const route = useRoute()
const { t } = useI18n()

const tabs = computed(() => [
  { to: '/home', label: t('navHome'), icon: House },
  { to: '/pay', label: t('navPay'), icon: Send },
  { to: '/swap', label: t('navSwap'), icon: ArrowLeftRight },
])
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-10 border-t border-[#e5e5e5] bg-white pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]"
    :aria-label="t('appNav')"
  >
    <ul class="mx-auto flex h-[72px] w-full max-w-[min(100%,430px)] items-stretch">
      <li v-for="tab in tabs" :key="tab.to" class="flex-1">
        <NuxtLink
          :to="tab.to"
          class="flex h-full flex-col items-center justify-center gap-1 text-[12px] leading-[1.33] font-medium"
          :class="route.path === tab.to ? 'text-[#0a0a0a]' : 'text-[#737373]'"
          :aria-current="route.path === tab.to ? 'page' : undefined"
        >
          <component :is="tab.icon" class="size-5" :stroke-width="1.75" />
          {{ tab.label }}
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>
