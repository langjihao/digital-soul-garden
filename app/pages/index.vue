<script setup lang="ts">
const { t } = useLang()
const { show: showTwin } = useTwin()

const { data: posts } = await useAsyncData('home-posts', () =>
  queryCollection('posts').where('draft', '=', false).order('date', 'DESC').limit(4).all(),
)
const { data: tweets } = await useAsyncData('home-tweets', () =>
  queryCollection('tweets').order('num', 'DESC').limit(3).all(),
)
</script>

<template>
  <div>
    <!-- hero -->
    <section class="relative border-b border-border overflow-hidden">
      <div class="absolute inset-0 garden-grid" aria-hidden="true" />
      <div class="relative mx-auto max-w-5xl px-5 pt-16 pb-14 sm:pt-24 sm:pb-20">
        <div class="max-w-2xl">
          <TerminalPrompt cmd="whoami" typed />
          <h1 class="mt-4 text-3xl sm:text-[2.6rem] font-bold leading-tight tracking-tight">
            {{ t.taglinePre }}<span class="text-accent">{{ t.taglineHi }}</span>{{ t.taglinePost }}
          </h1>
          <p class="mt-5 text-base sm:text-lg leading-relaxed text-ink-soft">
            {{ t.heroBody }}
          </p>
          <div class="mt-8 flex flex-wrap items-center gap-3">
            <NuxtLink
              to="/posts"
              class="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-bg transition-all hover:brightness-110 hover:shadow-[var(--glow)]"
            >
              {{ t.readPosts }}
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-7-7 7 7-7 7"/></svg>
            </NuxtLink>
            <button
              class="pressable inline-flex items-center gap-2 rounded-lg border border-border-strong px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-accent hover:border-accent"
              @click="showTwin()"
            >
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></svg>
              {{ t.talkToTwin }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- latest posts -->
    <section class="mx-auto max-w-5xl px-5 mt-14">
      <div v-reveal class="flex items-baseline justify-between">
        <div>
          <TerminalPrompt cmd="cd /posts" />
          <h2 class="mt-2 text-xl font-bold">{{ t.latestPosts }}</h2>
        </div>
        <NuxtLink to="/posts" class="font-mono text-xs text-muted hover:text-accent transition-colors">{{ t.allPosts }} →</NuxtLink>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2">
        <PostCard v-for="(post, i) in posts" :key="post.path" v-reveal="i" :post="post" />
      </div>
    </section>

    <!-- recent tweets -->
    <section class="mx-auto max-w-5xl px-5 mt-14">
      <div v-reveal class="flex items-baseline justify-between">
        <div>
          <TerminalPrompt cmd="cd /tweets" />
          <h2 class="mt-2 text-xl font-bold">{{ t.latestTweets }}</h2>
        </div>
        <NuxtLink to="/tweets" class="font-mono text-xs text-muted hover:text-accent transition-colors">git log →</NuxtLink>
      </div>
      <div class="mt-6 grid gap-3">
        <TweetItem v-for="(tw, i) in tweets" :key="tw.num" v-reveal="i" :tweet="tw" />
      </div>
    </section>

    <!-- twin teaser -->
    <section class="mx-auto max-w-5xl px-5 mt-16">
      <div v-reveal class="rounded-2xl border border-border bg-surface p-8 sm:p-10 relative overflow-hidden">
        <div class="absolute inset-0 garden-grid opacity-60" />
        <div class="relative">
          <TerminalPrompt cmd="./digital_twin --rag" />
          <h2 class="mt-3 text-2xl font-bold">{{ t.twinTitle }}</h2>
          <p class="mt-3 max-w-xl text-sm sm:text-base leading-relaxed text-ink-soft">{{ t.twinBody }}</p>
        </div>
      </div>
    </section>
  </div>
</template>
