<script setup lang="ts">
const props = defineProps<{
  post: { path?: string; title?: string; description?: string; date?: string; tags?: string[]; minutes?: number }
}>()
const { t } = useLang()

const dateLabel = computed(() => {
  if (!props.post.date) return ''
  const d = new Date(props.post.date)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})
</script>

<template>
  <NuxtLink
    :to="post.path"
    class="card-sweep group block rounded-xl border border-border bg-surface p-5 sm:p-6 transition-all duration-300 hover:border-border-strong hover:bg-surface-hover hover:shadow-[var(--glow)] hover:-translate-y-0.5"
  >
    <div class="flex items-center gap-3 font-mono text-xs text-muted">
      <time>{{ dateLabel }}</time>
      <span class="text-border-strong">·</span>
      <span>{{ post.minutes }} {{ t.minutes }}</span>
    </div>
    <h3 class="mt-2.5 text-lg font-semibold leading-snug text-ink group-hover:text-accent transition-colors">
      {{ post.title }}
    </h3>
    <p class="mt-2 text-sm leading-relaxed text-ink-soft line-clamp-2">
      {{ post.description }}
    </p>
    <div v-if="post.tags?.length" class="mt-3.5 flex flex-wrap gap-2">
      <span v-for="tag in post.tags" :key="tag" class="font-mono text-[11px] text-muted group-hover:text-ink-soft transition-colors">
        <span class="text-accent/70">#</span>{{ tag }}
      </span>
    </div>
  </NuxtLink>
</template>
