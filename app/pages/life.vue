<script setup lang="ts">
const { t } = useLang()
useHead({ title: computed(() => `${t.value.life} · ~/garden`) })

interface LifeItem {
  id: string; source: string; kind: string; title: string; date: string; status: string
  cover?: string; url?: string; rating?: number; comment?: string; author?: string
  sport?: { type: string; distanceKm?: number; durationMin?: number; calorie?: number; pace?: string }
  reading?: { progress?: number }
}
interface LifeData {
  updatedAt: string; demo: boolean
  sources: { douban: boolean; weread: boolean; keep: boolean }
  stats: {
    books: { done: number; doing: number }; movies: { done: number }; music: { done: number }
    workouts: { count: number; distanceKm: number; durationHour: number; calorie: number }
    readingHour?: number
  }
  items: LifeItem[]
}

const { data } = await useAsyncData('life-wall', () => $fetch<LifeData>('/api/life'))

const SHELF_LIMIT = 12
const shelves = computed(() => {
  const items = data.value?.items ?? []
  const of = (kind: string) => items.filter(i => i.kind === kind)
  return [
    { key: 'book', cmd: 'ls books/', label: t.value.lifeBooks, items: of('book') },
    { key: 'movie', cmd: 'ls movies/', label: t.value.lifeMovies, items: of('movie') },
    { key: 'music', cmd: 'ls music/', label: t.value.lifeMusic, items: of('music') },
  ].filter(s => s.items.length)
})
const expanded = ref<Record<string, boolean>>({})

const workouts = computed(() => (data.value?.items ?? []).filter(i => i.kind === 'workout'))
const heatItems = computed(() => workouts.value.map(w => ({ date: w.date, value: w.sport?.distanceKm ?? 0.5 })))
const recentWorkouts = computed(() => workouts.value.slice(0, 5))
const stats = computed(() => data.value?.stats)

const fmtDate = (iso: string) => iso.slice(0, 10)
</script>

<template>
  <div class="mx-auto max-w-5xl px-5 pt-12 pb-8">
    <TerminalPrompt cmd="cat life/wall.log" typed />
    <h1 class="mt-3 text-2xl sm:text-3xl font-bold">{{ t.life }}</h1>
    <p class="mt-3 max-w-xl text-sm sm:text-base text-ink-soft leading-relaxed">{{ t.lifeIntro }}</p>

    <div
      v-if="data?.demo"
      class="mt-5 rounded-lg border border-dashed border-border-strong bg-surface px-4 py-3 font-mono text-xs text-muted"
    >
      <span class="text-amber">◈ demo</span> {{ t.lifeDemoNote }}
    </div>

    <!-- 总览统计 -->
    <div v-if="stats" v-reveal class="mt-8 grid gap-3" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr))">
      <div v-if="stats.books.done || stats.books.doing" class="rounded-xl border border-border bg-surface p-4">
        <p class="font-mono text-[11px] text-muted uppercase tracking-wide">books</p>
        <p class="mt-1 text-2xl font-bold text-ink">{{ stats.books.done }}<span class="ml-1 text-sm font-normal text-muted">{{ t.lifeBooksDone }}</span></p>
        <p class="font-mono text-[11px] text-accent mt-0.5">{{ stats.books.doing }} {{ t.lifeBooksDoing }}<template v-if="stats.readingHour"> · {{ stats.readingHour }}h</template></p>
      </div>
      <div v-if="stats.movies.done" class="rounded-xl border border-border bg-surface p-4">
        <p class="font-mono text-[11px] text-muted uppercase tracking-wide">movies</p>
        <p class="mt-1 text-2xl font-bold text-ink">{{ stats.movies.done }}<span class="ml-1 text-sm font-normal text-muted">{{ t.lifeMoviesDone }}</span></p>
      </div>
      <div v-if="stats.music.done" class="rounded-xl border border-border bg-surface p-4">
        <p class="font-mono text-[11px] text-muted uppercase tracking-wide">music</p>
        <p class="mt-1 text-2xl font-bold text-ink">{{ stats.music.done }}<span class="ml-1 text-sm font-normal text-muted">{{ t.lifeMusicDone }}</span></p>
      </div>
      <div v-if="stats.workouts.count" class="rounded-xl border border-border bg-surface p-4">
        <p class="font-mono text-[11px] text-muted uppercase tracking-wide">workouts</p>
        <p class="mt-1 text-2xl font-bold text-ink">{{ stats.workouts.distanceKm }}<span class="ml-1 text-sm font-normal text-muted">km</span></p>
        <p class="font-mono text-[11px] text-accent mt-0.5">{{ stats.workouts.count }} {{ t.lifeWorkoutTimes }} · {{ stats.workouts.durationHour }}h</p>
      </div>
    </div>

    <!-- 运动热力图 -->
    <section v-if="workouts.length" v-reveal class="mt-10">
      <TerminalPrompt cmd="keep --heatmap" />
      <div class="mt-4 rounded-xl border border-border bg-surface p-4 sm:p-5">
        <LifeHeatmap :items="heatItems" />
        <ul class="mt-4 border-t border-border pt-3 space-y-1.5">
          <li v-for="w in recentWorkouts" :key="w.id" class="flex items-baseline gap-3 font-mono text-xs">
            <span class="text-muted shrink-0">{{ fmtDate(w.date) }}</span>
            <span class="text-ink">{{ w.sport?.type || w.title }}</span>
            <span v-if="w.sport?.distanceKm" class="text-accent">{{ w.sport.distanceKm }}km</span>
            <span v-if="w.sport?.pace" class="text-muted hidden sm:inline">{{ w.sport.pace }}</span>
            <span v-if="w.sport?.durationMin" class="text-muted ml-auto shrink-0">{{ w.sport.durationMin }}min</span>
          </li>
        </ul>
      </div>
    </section>

    <!-- 书 / 影 / 音 墙 -->
    <section v-for="shelf in shelves" :key="shelf.key" v-reveal class="mt-10">
      <div class="flex items-baseline justify-between">
        <TerminalPrompt :cmd="shelf.cmd" />
        <span class="font-mono text-[11px] text-muted">{{ shelf.items.length }} {{ t.lifeTotal }}</span>
      </div>
      <div class="mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        <LifeShelfCard
          v-for="(item, i) in (expanded[shelf.key] ? shelf.items : shelf.items.slice(0, SHELF_LIMIT))"
          :key="item.id" v-reveal="i % 6" :item="item"
        />
      </div>
      <button
        v-if="shelf.items.length > SHELF_LIMIT"
        class="pressable mt-4 font-mono text-xs text-muted border border-border rounded-md px-3 py-1.5 hover:border-border-strong hover:text-ink-soft transition-colors"
        @click="expanded[shelf.key] = !expanded[shelf.key]"
      >
        {{ expanded[shelf.key] ? t.lifeCollapse : `${t.lifeShowAll} (${shelf.items.length})` }}
      </button>
    </section>

    <p v-if="data && !data.demo" class="mt-10 font-mono text-[11px] text-muted">
      {{ t.lifeSyncedAt }} {{ data.updatedAt.slice(0, 16).replace('T', ' ') }} UTC ·
      {{ [data.sources.weread && '微信读书', data.sources.douban && '豆瓣', data.sources.keep && 'Keep'].filter(Boolean).join(' + ') }}
    </p>
  </div>
</template>
