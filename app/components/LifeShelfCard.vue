<script setup lang="ts">
const props = defineProps<{
  item: {
    kind: string; title: string; author?: string; cover?: string; url?: string
    status: string; rating?: number; comment?: string; date: string; source: string
    reading?: { progress?: number }
  }
}>()

const statusLabel: Record<string, Record<string, string>> = {
  book: { done: '读过', doing: '在读', mark: '想读' },
  movie: { done: '看过', doing: '在看', mark: '想看' },
  music: { done: '听过', doing: '在听', mark: '想听' },
}
const label = computed(() => statusLabel[props.item.kind]?.[props.item.status] ?? '')
const sourceTag = computed(() => (props.item.source === 'weread' ? '微信读书' : props.item.source === 'douban' ? '豆瓣' : ''))
// 无封面时的确定性占位色：标题哈希取色相
const hue = computed(() => {
  let h = 0
  for (const c of props.item.title) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
})
</script>

<template>
  <component
    :is="item.url ? 'a' : 'div'"
    :href="item.url" :target="item.url ? '_blank' : undefined" rel="noreferrer"
    class="card-sweep group block rounded-lg border border-border bg-surface overflow-hidden transition-all duration-300 hover:border-border-strong hover:-translate-y-0.5 hover:shadow-[var(--glow)]"
  >
    <div class="aspect-[2/3] overflow-hidden border-b border-border relative">
      <img
        v-if="item.cover" :src="item.cover" :alt="item.title" referrerpolicy="no-referrer" loading="lazy"
        class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
      >
      <div
        v-else class="w-full h-full flex items-end p-2.5"
        :style="{ background: `linear-gradient(160deg, oklch(0.45 0.09 ${hue}) 0%, oklch(0.28 0.06 ${hue + 40}) 100%)` }"
      >
        <span class="text-[13px] leading-snug font-medium text-white/90 line-clamp-4">{{ item.title }}</span>
      </div>
      <span
        v-if="label && item.status !== 'done'"
        class="absolute top-1.5 right-1.5 rounded bg-bg/85 backdrop-blur px-1.5 py-0.5 font-mono text-[10px]"
        :class="item.status === 'doing' ? 'text-accent' : 'text-muted'"
      >{{ label }}</span>
      <div
        v-if="item.reading?.progress && item.status === 'doing'"
        class="absolute bottom-0 left-0 h-[3px] bg-accent" :style="{ width: item.reading.progress + '%' }"
      />
    </div>
    <div class="p-2.5">
      <h3 class="text-[13px] font-medium text-ink leading-snug line-clamp-1" :title="item.title">{{ item.title }}</h3>
      <div class="mt-1 flex items-center gap-1.5 font-mono text-[10px] text-muted min-w-0">
        <span v-if="item.rating" class="text-amber shrink-0">{{ '★'.repeat(item.rating) }}</span>
        <span class="truncate">{{ item.author || sourceTag }}</span>
      </div>
    </div>
  </component>
</template>
