<script setup lang="ts">
const { lang, t, toggle: toggleLang } = useLang()
const { isDark, toggle: toggleTheme } = useTheme()
const route = useRoute()

const nav = computed(() => [
  { to: '/posts', label: t.value.posts },
  { to: '/tweets', label: t.value.tweets },
  { to: '/media', label: t.value.media },
  { to: '/about', label: t.value.about },
])

const isActive = (to: string) => route.path === to || route.path.startsWith(to + '/')
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
    <div class="mx-auto max-w-5xl px-5 h-14 flex items-center gap-6">
      <NuxtLink to="/" class="font-mono text-sm font-semibold text-ink hover:text-accent transition-colors shrink-0">
        <span class="text-accent">~</span>/garden<span class="caret" />
      </NuxtLink>

      <nav class="flex items-center gap-1 text-sm flex-1">
        <NuxtLink
          v-for="item in nav" :key="item.to" :to="item.to"
          class="nav-link px-3 py-1.5 rounded-md transition-colors"
          :class="isActive(item.to) ? 'nav-active text-accent font-medium' : 'text-ink-soft hover:text-ink'"
        >
          {{ item.label }}
        </NuxtLink>
      </nav>

      <div class="flex items-center gap-2 shrink-0">
        <button
          class="hidden sm:flex items-center gap-2 text-xs font-mono text-muted border border-border rounded-md px-2.5 py-1.5 hover:border-border-strong hover:text-ink-soft transition-colors"
          title="搜索 (⌘K)"
        >
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          <kbd class="text-[10px]">⌘K</kbd>
        </button>

        <button
          class="font-mono text-xs text-ink-soft border border-border rounded-md px-2.5 py-1.5 hover:border-border-strong transition-colors"
          @click="toggleLang"
        >
          {{ lang === 'zh' ? '中' : 'EN' }}
        </button>

        <button
          class="pressable text-ink-soft border border-border rounded-md p-1.5 hover:border-border-strong hover:text-amber transition-colors"
          :title="isDark ? '切换亮色' : '切换暗色'"
          @click="toggleTheme"
        >
          <svg v-if="isDark" :key="'sun'" class="icon-spin-in w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4"/></svg>
          <svg v-else :key="'moon'" class="icon-spin-in w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
        </button>
      </div>
    </div>
  </header>
</template>
