<script setup lang="ts">
const props = defineProps<{ error: { statusCode?: number; statusMessage?: string } }>()
const is404 = computed(() => props.error?.statusCode === 404)
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-ink">
    <SiteHeader />
    <main class="flex-1 flex items-center justify-center px-5 py-16">
      <div class="w-full max-w-lg rounded-xl border border-border bg-surface overflow-hidden">
        <div class="flex items-center gap-1.5 border-b border-border px-4 py-2.5">
          <span class="h-2.5 w-2.5 rounded-full bg-[#f87171]" />
          <span class="h-2.5 w-2.5 rounded-full bg-amber" />
          <span class="h-2.5 w-2.5 rounded-full bg-accent" />
          <span class="ml-2 font-mono text-xs text-muted">bash — ~/garden</span>
        </div>
        <div class="p-5 font-mono text-sm space-y-2">
          <p class="text-muted">$ open {{ is404 ? '这个页面' : '服务' }}</p>
          <p v-if="is404" class="text-ink-soft">
            bash: <span class="text-amber">404</span>: page not found — 这条小径还没被种下
          </p>
          <p v-else class="text-ink-soft">
            bash: <span class="text-[#f87171]">{{ error?.statusCode ?? 500 }}</span>: {{ error?.statusMessage || 'internal error' }} — 花园里出了点状况
          </p>
          <p class="text-muted pt-2">$ cd <NuxtLink to="/" class="text-accent underline underline-offset-4" @click="clearError()">~/garden</NuxtLink><span class="caret" /></p>
        </div>
      </div>
    </main>
    <SiteFooter />
  </div>
</template>
