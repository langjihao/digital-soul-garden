<script setup lang="ts">
const route = useRoute()
const tag = computed(() => String(route.params.tag))
useHead({ title: computed(() => `#${tag.value} · ~/garden`) })

const { data: posts } = await useAsyncData(`tag-${tag.value}`, () =>
  queryCollection('posts').where('draft', '=', false).order('date', 'DESC').all(),
)
const filtered = computed(() => posts.value?.filter(p => (p.tags as string[] | undefined)?.includes(tag.value)) ?? [])
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 pt-12">
    <TerminalPrompt :cmd="`grep -r '#${tag}' posts/`" />
    <h1 class="mt-3 text-2xl sm:text-3xl font-bold"><span class="text-accent">#</span> {{ tag }}</h1>
    <p class="mt-3 text-sm text-ink-soft font-mono">{{ filtered.length }} matches</p>

    <div class="mt-8 grid gap-4 pb-4">
      <PostCard v-for="(post, i) in filtered" :key="post.path" v-reveal="i" :post="post" />
    </div>

    <NuxtLink to="/posts" class="inline-block mb-10 font-mono text-xs text-muted hover:text-accent transition-colors">← 全部文章</NuxtLink>
  </div>
</template>
