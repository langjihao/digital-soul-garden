<script setup lang="ts">
const { t } = useLang()
useHead({ title: computed(() => `${t.value.tweets} · ~/garden`) })

const { data: tweets } = await useAsyncData('all-tweets', () =>
  queryCollection('tweets').order('num', 'DESC').all(),
)
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 pt-12">
    <TerminalPrompt cmd="git log --label tweet" />
    <h1 class="mt-3 text-2xl sm:text-3xl font-bold">{{ t.tweets }}</h1>
    <p class="mt-3 text-sm sm:text-base text-ink-soft leading-relaxed">
      每条碎念是仓库里的一次轻提交：短、及时、不打磨。
    </p>

    <div class="mt-8 relative pb-4">
      <div class="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
      <div class="space-y-4">
        <div v-for="tw in tweets" :key="tw.num" class="relative pl-8">
          <span class="absolute left-0 top-5 w-[15px] h-[15px] rounded-full border-2 border-accent bg-bg" aria-hidden="true" />
          <TweetItem :tweet="tw" />
        </div>
      </div>
    </div>
  </div>
</template>
