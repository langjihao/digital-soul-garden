<script setup lang="ts">
const props = defineProps<{ path: string }>()

const { data, status } = await useLazyFetch<{ summary: string; mode: string }>('/api/twin/summary', {
  query: { path: props.path },
  server: false,
})
</script>

<template>
  <aside class="rounded-xl border border-border bg-bg-soft p-4 sm:p-5">
    <div class="flex items-center gap-2 font-mono text-xs text-muted">
      <svg class="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></svg>
      <span>tl;dr</span>
      <span class="text-border-strong">·</span>
      <span>{{ data?.mode === 'live' ? '孪生摘要' : '孪生摘要（演示）' }}</span>
    </div>
    <div v-if="status === 'pending'" class="mt-3 space-y-2">
      <div class="h-3 w-4/5 animate-pulse rounded bg-surface-hover" />
      <div class="h-3 w-3/5 animate-pulse rounded bg-surface-hover" />
      <div class="h-3 w-2/3 animate-pulse rounded bg-surface-hover" />
    </div>
    <p v-else-if="data" class="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{{ data.summary }}</p>
  </aside>
</template>
