<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { stashPendingPayUri } from '~/lib/pending-pay-uri'
import { writeBoundAddress } from '~/lib/bound-address'

const { t, locale, setLocale } = useI18n()
const route = useRoute()
const account = useAccountStore()
const router = useRouter()
const { open } = useSigningSession()

definePageMeta({
  layout: false,
})

const promises = [
  { title: 'promiseSeedTitle', body: 'promiseSeedBody' },
  { title: 'promiseExtTitle', body: 'promiseExtBody' },
  { title: 'promiseCustodyTitle', body: 'promiseCustodyBody' },
] as const

const steps = [
  { title: 'pathPasskeyTitle', body: 'pathPasskeyBody' },
  { title: 'pathPayTitle', body: 'pathPayBody' },
  { title: 'pathSwapTitle', body: 'pathSwapBody' },
] as const

const ctaClass = 'mt-10 h-11 w-full max-w-[280px] rounded-[18px] text-[14px] font-medium'
const isOpening = ref(false)

async function onStart() {
  if (isOpening.value)
    return
    
  stashQueryUri()
  isOpening.value = true
  
  const ok = await open()
  
  if (ok && account.address) {
    writeBoundAddress(account.address)
    await router.push('/home')
  }
  
  isOpening.value = false
}

function stashQueryUri() {
  const uri = typeof route.query.uri === 'string' ? route.query.uri : undefined
  if (uri)
    stashPendingPayUri(uri)
}

function toggleLocale() {
  setLocale(locale.value === 'zh-CN' ? 'en' : 'zh-CN')
}

onMounted(stashQueryUri)
</script>

<template>
  <!--
    THESIS: Compact dossier gate — understand first, then one Continue; refuse Operate desktop shell.
    OWN-WORLD: Clinical frosted paper — canvas #f5f5f5, paper white, ink, Geist, 18px controls / hairline rules.
    STORY: Visitor sees Flowpay is a normal-app Passkey entry with no seed/extension/custody, then starts the session.
    FIRST VIEWPORT: Brand + CTA + hint + judge cue; compact slip on narrow; lg two-pane slip (ADR 0009).
    FORM: Compact dossier; mobile visual anchor; human copy; Passkey-as-account cue.
    FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
  -->
  <main class="landing relative bg-background text-foreground pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
    <header class="mx-auto flex w-full max-w-6xl items-center justify-end px-6 pt-5 lg:px-10">
      <button
        type="button"
        class="h-10 rounded-[18px] px-3 text-[14px] font-medium text-[#737373] transition-colors hover:text-[#0a0a0a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a0a0a]"
        @click="toggleLocale"
      >
        {{ t('lang') }}
      </button>
    </header>

    <section
      class="landing-hero flex min-h-[calc(100dvh-4rem)] flex-col items-center justify-center px-6 pb-10 lg:mx-auto lg:grid lg:max-w-6xl lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-10 lg:pb-16"
      aria-labelledby="landing-brand"
    >
      <div
        class="landing-hero-inner flex w-full max-w-[min(100%,430px)] flex-col items-center text-center lg:max-w-none lg:items-start lg:text-left"
      >
        <h1
          id="landing-brand"
          class="text-[48px] leading-[1.1] font-semibold tracking-[-0.04em] text-[#0a0a0a]"
        >
          Flowpay
        </h1>
        <p class="mt-4 max-w-[28ch] text-[16px] leading-[1.5] text-[#737373] lg:max-w-[36ch]">
          {{ t('tagline') }}
        </p>

        <Button
          :class="ctaClass"
          :disabled="isOpening"
          @click="onStart"
        >
          {{ isOpening ? t('opening') : t('start') }}
        </Button>

        <p class="mt-4 max-w-[32ch] text-[13px] leading-[1.4] text-[#737373]">
          {{ t('hint') }}
        </p>
        <p class="mt-2 max-w-[36ch] text-[13px] leading-[1.4] text-[#0a0a0a]/70">
          {{ t('judgeCue') }}
        </p>
        <p class="mt-2 max-w-[36ch] text-[13px] leading-[1.4] text-[#737373]">
          {{ t('returnHint') }}
        </p>

        <p
          v-if="account.errorMessage"
          class="mt-4 max-w-sm text-[14px] leading-[1.43] text-[#e7000b]"
          role="alert"
        >
          {{ t(account.errorMessage) }}
        </p>

        <div class="landing-mock mt-8 w-full max-w-[280px] lg:hidden">
          <PayKeyDeskMock
            compact
            caption-id="pay-mock-caption-mobile"
          />
        </div>
      </div>

      <div class="landing-mock mt-12 hidden w-full max-w-[320px] justify-self-center lg:mt-0 lg:block">
        <PayKeyDeskMock caption-id="pay-mock-caption-desktop" />
      </div>
    </section>

    <div
      class="mx-auto w-full max-w-3xl px-6"
      aria-hidden="true"
    >
      <div class="border-t border-[#e5e5e5]" />
    </div>

    <section
      class="mx-auto w-full max-w-[min(100%,430px)] px-6 pt-16 pb-4 lg:max-w-2xl"
      aria-labelledby="landing-promises"
    >
      <h2
        id="landing-promises"
        class="text-[24px] leading-[1.33] font-semibold tracking-[-0.025em] text-[#0a0a0a]"
      >
        {{ t('promisesHeading') }}
      </h2>
      <ul class="mt-8 divide-y divide-[#e5e5e5] border-y border-[#e5e5e5]">
        <li
          v-for="item in promises"
          :key="item.title"
          class="py-5"
        >
          <p class="text-[16px] leading-[1.5] font-medium text-[#0a0a0a]">
            {{ t(item.title) }}
          </p>
          <p class="mt-1.5 text-[14px] leading-[1.43] text-[#737373]">
            {{ t(item.body) }}
          </p>
        </li>
      </ul>
    </section>

    <section
      class="mx-auto w-full max-w-[min(100%,430px)] px-6 pt-16 pb-4 lg:max-w-2xl"
      aria-labelledby="landing-path"
    >
      <h2
        id="landing-path"
        class="text-[24px] leading-[1.33] font-semibold tracking-[-0.025em] text-[#0a0a0a]"
      >
        {{ t('pathHeading') }}
      </h2>
      <ol class="mt-8 space-y-8">
        <li
          v-for="(step, index) in steps"
          :key="step.title"
          class="grid grid-cols-[2.5rem_1fr] gap-x-3"
        >
          <span
            class="pt-0.5 text-[14px] leading-[1.43] font-medium tabular-nums text-[#737373]"
            aria-hidden="true"
          >
            {{ index + 1 }}
          </span>
          <div>
            <p class="text-[16px] leading-[1.5] font-medium text-[#0a0a0a]">
              {{ t(step.title) }}
            </p>
            <p class="mt-1.5 text-[14px] leading-[1.43] text-[#737373]">
              {{ t(step.body) }}
            </p>
          </div>
        </li>
      </ol>
    </section>

    <section class="mx-auto flex w-full max-w-[min(100%,430px)] flex-col items-center px-6 pt-16 pb-24 text-center lg:max-w-2xl">
      <p class="max-w-[28ch] text-[16px] leading-[1.5] text-[#737373]">
        {{ t('closeLine') }}
      </p>
      <Button
        class="mt-8 h-11 w-full max-w-[280px] rounded-[18px] text-[14px] font-medium"
        :disabled="isOpening"
        @click="onStart"
      >
        {{ isOpening ? t('opening') : t('start') }}
      </Button>
    </section>
  </main>
</template>

<style scoped>
.landing {
  background-color: #f5f5f5;
  background-image:
    radial-gradient(ellipse 120% 80% at 50% -20%, rgba(255, 255, 255, 0.9), transparent 55%),
    linear-gradient(180deg, #fafafa 0%, #f5f5f5 28%, #f5f5f5 100%);
}

.landing-hero-inner {
  animation: landing-settle 720ms cubic-bezier(0.16, 1, 0.3, 1) both;
}

.landing-mock {
  animation: landing-settle 720ms cubic-bezier(0.16, 1, 0.3, 1) 120ms both;
}

@keyframes landing-settle {
  from {
    opacity: 0.01;
    filter: blur(4px);
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    filter: blur(0);
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .landing-hero-inner,
  .landing-mock {
    animation: none;
  }
}
</style>
