<script setup lang="ts">
const { t } = useLang()
useHead({ title: computed(() => `${t.value.media} · ~/garden`) })

const { data: items } = await useAsyncData('all-media', () =>
  queryCollection('media').order('date', 'DESC').all(),
)
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 pt-12">
    <TerminalPrompt cmd="open media/" />
    <h1 class="mt-3 text-2xl sm:text-3xl font-bold">{{ t.media }}</h1>
    <p class="mt-3 max-w-xl text-sm sm:text-base text-ink-soft leading-relaxed">
      照片签到、语音笔记与在读在看。说明文本同样会被索引，因此也会出现在检索结果里。
    </p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 pb-4">
      <MediaCard v-for="item in items" :key="item.title" :item="item" />
    </div>
  </div>
</template>
