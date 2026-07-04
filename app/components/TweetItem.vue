<script setup lang="ts">
const props = defineProps<{
  tweet: { num: number; date: string; text: string; likes: number; replies: number; tags?: string[] }
  compact?: boolean
}>()

const dateLabel = computed(() => {
  const d = new Date(props.tweet.date)
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

// render `code` spans in tweet text
const html = computed(() =>
  props.tweet.text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>'),
)
</script>

<template>
  <article
    class="group relative rounded-xl border border-border bg-surface p-4 sm:p-5 transition-all duration-300 hover:border-border-strong hover:bg-surface-hover"
  >
    <div class="flex items-center gap-3 font-mono text-xs text-muted">
      <span class="text-accent"># {{ tweet.num }}</span>
      <time>{{ dateLabel }}</time>
    </div>
    <p class="tweet-body mt-2 text-[15px] leading-relaxed text-ink-soft" v-html="html" />
    <div class="mt-3 flex items-center gap-5 font-mono text-xs text-muted">
      <span class="flex items-center gap-1.5 group-hover:text-amber transition-colors">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2C10.5 3.5 9.3 3 7.5 3A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7Z"/></svg>
        {{ tweet.likes }}
      </span>
      <span class="flex items-center gap-1.5">
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        {{ tweet.replies }}
      </span>
      <span class="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted">issue ↗</span>
    </div>
  </article>
</template>

<style scoped>
.tweet-body :deep(code) {
  font-family: var(--font-mono);
  font-size: 0.85em;
  background: var(--code-bg);
  border: 1px solid var(--border);
  padding: 0.1em 0.35em;
  border-radius: 4px;
  color: var(--amber);
}
</style>
