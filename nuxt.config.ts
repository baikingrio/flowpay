import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ssr: false,

  vite: {
    plugins: [tailwindcss()],
  },

  modules: [
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/eslint',
    'shadcn-nuxt',
    '@nuxtjs/i18n',
  ],

  css: ['~/assets/css/tailwind.css'],

  app: {
    head: {
      title: 'Flowpay',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        {
          name: 'description',
          content: '像流水一样顺畅的链上支付与账户体验',
        },
      ],
    },
  },

  shadcn: {
    prefix: '',
    componentDir: '@/components/ui',
  },

  typescript: {
    strict: true,
    typeCheck: true,
  },

  i18n: {
    vueI18n: 'i18n.config.ts',
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix',
    detectBrowserLanguage: false,
    locales: [
      { code: 'zh-CN', language: 'zh-CN' },
      { code: 'en', language: 'en' },
    ],
  },
})
