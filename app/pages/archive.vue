<script setup lang="ts">
const { t } = useLang()
useHead({ title: '归档 · ~/garden' })

const { data: posts } = await useAsyncData('archive-posts', () =>
  queryCollection('posts').where('draft', '=', false).order('date', 'DESC').all(),
)

const byYear = computed(() => {
  const groups: Record<string, typeof posts.value> = {}
  for (const p of posts.value ?? []) {
    const y = new Date(p.date as string).getFullYear().toString()
    ;(groups[y] ??= []).push(p)
  }
  return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
})

function mmdd(date: string) {
  const d = new Date(date)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 pt-12">
    <TerminalPrompt cmd="tree posts/ --by-year" typed />
    <h1 class="mt-3 text-2xl sm:text-3xl font-bold">归档</h1>
    <p class="mt-3 text-sm sm:text-base text-ink-soft">{{ posts?.length ?? 0 }} 篇文章，按年生长。</p>

    <div class="mt-10 space-y-10 pb-8 font-mono">
      <section v-for="[year, list] in byYear" :key="year" v-reveal>
        <h2 class="text-lg font-bold text-accent">{{ year }}<span class="text-muted">/</span></h2>
        <ul class="mt-3">
          <li v-for="(p, i) in list" :key="p.path" class="group flex">
            <span class="text-border-strong select-none shrink-0">{{ i === list!.length - 1 ? '└──' : '├──' }}</span>
            <NuxtLink :to="p.path" class="ml-3 flex flex-col sm:flex-row sm:items-baseline gap-0.5 sm:gap-4 py-1.5 min-w-0">
              <time class="text-xs text-muted shrink-0">{{ mmdd(p.date as string) }}</time>
              <span class="text-sm text-ink-soft group-hover:text-accent transition-colors truncate font-sans">{{ p.title }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
