<script setup lang="ts">
const props = defineProps<{
  item: { kind: string; title: string; note: string; date: string; duration?: string; cover?: string; rating?: number }
}>()

const kindMeta: Record<string, { icon: string; label: string }> = {
  photo: { icon: '📷', label: 'photo' },
  audio: { icon: '🎙', label: 'voice' },
  book: { icon: '📖', label: 'book' },
  film: { icon: '🎬', label: 'film' },
  music: { icon: '🎵', label: 'music' },
}
const meta = computed(() => kindMeta[props.item.kind] ?? kindMeta.photo!)
</script>

<template>
  <article class="group rounded-xl border border-border bg-surface overflow-hidden transition-all duration-300 hover:border-border-strong hover:-translate-y-0.5 hover:shadow-[var(--glow)]">
    <div v-if="item.cover" class="aspect-[4/3] overflow-hidden border-b border-border">
      <img :src="item.cover" :alt="item.title" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" loading="lazy">
    </div>
    <div class="p-4">
      <div class="flex items-center gap-2 font-mono text-xs text-muted">
        <span>{{ meta.icon }}</span>
        <span class="uppercase tracking-wide">{{ meta.label }}</span>
        <span v-if="item.duration" class="text-amber">{{ item.duration }}</span>
        <span v-if="item.rating" class="ml-auto text-amber">{{ '★'.repeat(item.rating) }}</span>
      </div>
      <h3 class="mt-2 text-sm font-medium text-ink leading-snug">{{ item.title }}</h3>
      <p class="mt-1.5 text-xs leading-relaxed text-muted line-clamp-2">{{ item.note }}</p>
    </div>
  </article>
</template>
