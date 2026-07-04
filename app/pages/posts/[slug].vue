<script setup lang="ts">
const route = useRoute()
const { t } = useLang()

const { data: post } = await useAsyncData(`post-${route.path}`, () =>
  queryCollection('posts').path(route.path).first(),
)
if (!post.value) {
  throw createError({ statusCode: 404, statusMessage: 'Post not found' })
}

const { data: surround } = await useAsyncData(`surround-${route.path}`, () =>
  queryCollectionItemSurroundings('posts', route.path, { fields: ['title'] })
    .where('draft', '=', false).order('date', 'DESC'),
)

useHead({ title: () => `${post.value?.title ?? ''} · ~/garden` })

const dateLabel = computed(() => {
  if (!post.value?.date) return ''
  const d = new Date(post.value.date as string)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
})

const toc = computed(() => post.value?.body?.toc?.links ?? [])
</script>

<template>
  <div v-if="post" class="mx-auto max-w-5xl px-5 pt-12">
    <NuxtLink to="/posts" class="font-mono text-xs text-muted hover:text-accent transition-colors">← {{ t.backToPosts }}</NuxtLink>

    <header class="mt-6 max-w-2xl">
      <div class="flex items-center gap-3 font-mono text-xs text-muted">
        <time>{{ dateLabel }}</time>
        <span class="text-border-strong">·</span>
        <span>{{ post.minutes }} {{ t.minutes }}</span>
      </div>
      <h1 class="mt-3 text-2xl sm:text-[2.1rem] font-bold leading-snug tracking-tight">{{ post.title }}</h1>
      <p class="mt-4 text-base leading-relaxed text-ink-soft">{{ post.description }}</p>
      <div v-if="post.tags?.length" class="mt-4 flex flex-wrap gap-2.5">
        <span v-for="tag in post.tags" :key="tag" class="font-mono text-xs text-muted"><span class="text-accent/70">#</span> {{ tag }}</span>
      </div>
    </header>

    <div class="mt-10 flex gap-10">
      <article class="prose min-w-0 flex-1 pb-8">
        <ContentRenderer :value="post" />
      </article>

      <aside v-if="toc.length" class="hidden lg:block w-56 shrink-0">
        <div class="sticky top-24">
          <div class="font-mono text-xs uppercase tracking-wider text-muted">{{ t.tocTitle }}</div>
          <ul class="mt-3 space-y-2 text-sm border-l border-border">
            <li v-for="link in toc" :key="link.id">
              <a :href="`#${link.id}`" class="block pl-3 -ml-px border-l border-transparent text-ink-soft hover:text-accent hover:border-accent transition-colors leading-snug">
                {{ link.text }}
              </a>
              <ul v-if="link.children" class="mt-1.5 space-y-1.5">
                <li v-for="child in link.children" :key="child.id">
                  <a :href="`#${child.id}`" class="block pl-7 -ml-px border-l border-transparent text-muted hover:text-accent hover:border-accent transition-colors text-[13px] leading-snug">
                    {{ child.text }}
                  </a>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </aside>
    </div>

    <nav class="mt-4 mb-2 grid gap-3 sm:grid-cols-2 border-t border-border pt-6 pb-6">
      <NuxtLink
        v-if="surround?.[0]" :to="surround[0].path"
        class="group rounded-lg border border-border bg-surface p-4 hover:border-border-strong transition-colors"
      >
        <div class="font-mono text-xs text-muted">← {{ t.prevPost }}</div>
        <div class="mt-1 text-sm text-ink-soft group-hover:text-accent transition-colors">{{ surround[0].title }}</div>
      </NuxtLink>
      <div v-else />
      <NuxtLink
        v-if="surround?.[1]" :to="surround[1].path"
        class="group rounded-lg border border-border bg-surface p-4 text-right hover:border-border-strong transition-colors"
      >
        <div class="font-mono text-xs text-muted">{{ t.nextPost }} →</div>
        <div class="mt-1 text-sm text-ink-soft group-hover:text-accent transition-colors">{{ surround[1].title }}</div>
      </NuxtLink>
    </nav>
  </div>
</template>
