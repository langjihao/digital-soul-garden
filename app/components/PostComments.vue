<script setup lang="ts">
// giscus 评论：基于 GitHub Discussions，pathname 映射。
// 仅在 NUXT_PUBLIC_GISCUS_REPO / NUXT_PUBLIC_GISCUS_REPO_ID 配置后渲染（运行时 env，改配置无需重构建）。
const cfg = useRuntimeConfig().public
const { isDark } = useTheme()
const { lang } = useLang()

const el = ref<HTMLElement>()
const enabled = computed(() => !!cfg.giscusRepo && !!cfg.giscusRepoId)
const theme = computed(() => (isDark.value ? 'transparent_dark' : 'light'))

function mount() {
  if (!el.value || !enabled.value) return
  el.value.innerHTML = ''
  const s = document.createElement('script')
  s.src = 'https://giscus.app/client.js'
  s.async = true
  s.crossOrigin = 'anonymous'
  const attrs: Record<string, string> = {
    'data-repo': String(cfg.giscusRepo),
    'data-repo-id': String(cfg.giscusRepoId),
    'data-category': String(cfg.giscusCategory || 'Announcements'),
    'data-category-id': String(cfg.giscusCategoryId),
    'data-mapping': 'pathname',
    'data-strict': '0',
    'data-reactions-enabled': '1',
    'data-emit-metadata': '0',
    'data-input-position': 'top',
    'data-theme': theme.value,
    'data-lang': lang.value === 'zh' ? 'zh-CN' : 'en',
    'data-loading': 'lazy',
  }
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v)
  el.value.appendChild(s)
}

// el 在 ClientOnly 内，onMounted 时可能尚未渲染，watch ref 更稳
watch(el, v => v && mount())
watch(() => lang.value, mount) // 语言切换需重载 widget

watch(theme, (next) => {
  // 主题切换用 postMessage 热更新，不重载
  document.querySelector<HTMLIFrameElement>('iframe.giscus-frame')
    ?.contentWindow?.postMessage({ giscus: { setConfig: { theme: next } } }, 'https://giscus.app')
})
</script>

<template>
  <section v-if="enabled" class="mt-2 border-t border-border pt-6">
    <TerminalPrompt cmd="cat comments/" />
    <ClientOnly>
      <div ref="el" class="mt-4 min-h-[120px]" />
    </ClientOnly>
  </section>
</template>
