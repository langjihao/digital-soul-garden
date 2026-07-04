import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: false },
  modules: ['@nuxt/content'],
  css: ['~/assets/css/main.css'],
  vite: {
    plugins: [tailwindcss()],
  },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    head: {
      htmlAttrs: { lang: 'zh-CN' },
      title: '~/garden — 数字花园',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '一座被索引、可检索、可对话的数字花园。' },
      ],
    },
  },
  content: {
    build: {
      markdown: {
        toc: { depth: 3 },
        highlight: {
          theme: { default: 'vitesse-dark', light: 'vitesse-light' },
          langs: ['ts', 'js', 'vue', 'sql', 'bash', 'json', 'yaml', 'python', 'go', 'rust', 'css', 'html', 'diff', 'md'],
        },
      },
    },
  },
  nitro: {
    prerender: { crawlLinks: false },
  },
})
