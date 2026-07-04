<script setup lang="ts">
const { t } = useLang()
useHead({ title: computed(() => `${t.value.posts} · ~/garden`) })

const { data: posts } = await useAsyncData('all-posts', () =>
  queryCollection('posts').where('draft', '=', false).order('date', 'DESC').all(),
)

const activeTag = ref<string | null>(null)
const allTags = computed(() => {
  const s = new Set<string>()
  posts.value?.forEach(p => (p.tags as string[] | undefined)?.forEach(t2 => s.add(t2)))
  return [...s].sort()
})
const filtered = computed(() =>
  activeTag.value ? posts.value?.filter(p => (p.tags as string[] | undefined)?.includes(activeTag.value!)) : posts.value,
)
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 pt-12">
    <TerminalPrompt cmd="ls posts/" typed />
    <h1 class="mt-3 text-2xl sm:text-3xl font-bold">{{ t.posts }}</h1>
    <p class="mt-3 max-w-xl text-sm sm:text-base text-ink-soft leading-relaxed">
      以 Markdown 写作、推送到 GitHub 即发布。⌘K 背后的检索覆盖下方所有内容。
    </p>

    <div class="mt-6 flex flex-wrap gap-2">
      <button
        class="font-mono text-xs rounded-full border px-3 py-1 transition-colors"
        :class="!activeTag ? 'border-accent text-accent bg-accent-soft' : 'border-border text-muted hover:border-border-strong'"
        @click="activeTag = null"
      >all</button>
      <button
        v-for="tag in allTags" :key="tag"
        class="font-mono text-xs rounded-full border px-3 py-1 transition-colors"
        :class="activeTag === tag ? 'border-accent text-accent bg-accent-soft' : 'border-border text-muted hover:border-border-strong'"
        @click="activeTag = activeTag === tag ? null : tag"
      ># {{ tag }}</button>
    </div>

    <div class="mt-8 grid gap-4 pb-4">
      <PostCard v-for="(post, i) in filtered" :key="post.path" v-reveal="i" :post="post" />
    </div>
  </div>
</template>
