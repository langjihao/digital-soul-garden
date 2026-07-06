<script setup lang="ts">
interface Photo {
  id: string; caption?: string; takenAt: string; location?: string
  thumb: string; preview: string; width?: number; height?: number
}
const props = defineProps<{ photos: Photo[] }>()

const INITIAL_MONTHS = 6
const showAll = ref(false)

const months = computed(() => {
  const map = new Map<string, Photo[]>()
  for (const p of props.photos) {
    const key = p.takenAt.slice(0, 7)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  const all = [...map.entries()].map(([period, items]) => ({ period, items }))
  return showAll.value ? all : all.slice(0, INITIAL_MONTHS)
})
const totalMonths = computed(() => new Set(props.photos.map(p => p.takenAt.slice(0, 7))).size)

const fmtMonth = (p: string) => `${p.slice(0, 4)} 年 ${Number(p.slice(5))} 月`

// 灯箱
const active = ref<Photo | null>(null)
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') active.value = null
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div>
    <ol class="relative border-l border-border-strong/70 ml-1.5 space-y-8">
      <li v-for="m in months" :key="m.period" class="pl-5 relative">
        <span class="absolute -left-[5px] top-1.5 w-[9px] h-[9px] rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
        <div class="flex items-baseline gap-2.5">
          <h3 class="font-mono text-sm font-semibold text-ink">{{ fmtMonth(m.period) }}</h3>
          <span class="font-mono text-[10px] text-muted">{{ m.items.length }} 📷</span>
        </div>
        <div class="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          <button
            v-for="p in m.items" :key="p.id"
            class="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-border-strong transition-all hover:-translate-y-0.5 hover:shadow-[var(--glow)]"
            @click="active = p"
          >
            <img :src="p.thumb" :alt="p.caption || p.location || 'photo'" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.06]">
            <span
              v-if="p.location"
              class="absolute bottom-0 inset-x-0 px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent text-white/90 font-mono text-[9px] text-left truncate opacity-0 group-hover:opacity-100 transition-opacity"
            >{{ p.location }}</span>
          </button>
        </div>
      </li>
    </ol>

    <button
      v-if="!showAll && totalMonths > INITIAL_MONTHS"
      class="pressable mt-6 ml-6 font-mono text-xs text-muted border border-border rounded-md px-3 py-1.5 hover:border-border-strong hover:text-ink-soft transition-colors"
      @click="showAll = true"
    >
      $ tail --all ({{ totalMonths }} months)
    </button>

    <!-- 灯箱 -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="active"
          class="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-10 cursor-zoom-out"
          @click="active = null"
        >
          <figure class="max-w-3xl max-h-full flex flex-col items-center" @click.stop>
            <img :src="active.preview" :alt="active.caption || 'photo'" class="max-h-[76vh] w-auto rounded-lg border border-white/15 shadow-2xl cursor-default">
            <figcaption class="mt-3 text-center">
              <p v-if="active.caption" class="text-sm text-white/90">{{ active.caption }}</p>
              <p class="mt-1 font-mono text-[11px] text-white/50">
                {{ active.takenAt.slice(0, 10) }}<template v-if="active.location"> · {{ active.location }}</template>
              </p>
            </figcaption>
          </figure>
          <button class="absolute top-4 right-5 text-white/60 hover:text-white font-mono text-xl" aria-label="关闭" @click="active = null">✕</button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
