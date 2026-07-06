import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  devtools: { enabled: false },
  runtimeConfig: {
    public: {
      siteUrl: 'https://blog.iqiqiqi.me',
      // giscus 评论：运行时以 NUXT_PUBLIC_GISCUS_* 环境变量注入，未配置则不渲染评论区
      giscusRepo: '',
      giscusRepoId: '',
      giscusCategory: 'Announcements',
      giscusCategoryId: '',
    },
  },
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
        { property: 'og:site_name', content: '~/garden — 数字花园' },
        { property: 'og:image', content: 'https://blog.iqiqiqi.me/og.png' },
        { name: 'theme-color', content: '#0a0f0c' },
      ],
      link: [
        { rel: 'alternate', type: 'application/rss+xml', title: '~/garden RSS', href: '/rss.xml' },
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      ],
      script: [
        {
          // set theme class before paint to avoid FOUC (global: applies to error page too)
          innerHTML: `(function(){try{var t=localStorage.getItem('garden-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
          tagPosition: 'head',
        },
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
