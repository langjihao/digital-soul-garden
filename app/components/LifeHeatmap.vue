<script setup lang="ts">
const props = defineProps<{
  // date(ISO) -> 强度值（km 或次数）
  items: { date: string; value: number }[]
}>()

const WEEKS = 53
const DAY = 86400_000

const grid = computed(() => {
  const byDay = new Map<string, number>()
  for (const it of props.items) {
    const key = it.date.slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + it.value)
  }
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  // 对齐到本周日结尾，往回 53 周
  const end = today.getTime() + (6 - today.getDay()) * DAY
  const cells: { key: string; v: number; future: boolean }[] = []
  for (let w = WEEKS - 1; w >= 0; w--) {
    for (let d = 6; d >= 0; d--) {
      const ts = end - (w * 7 + d) * DAY
      const key = new Date(ts).toISOString().slice(0, 10)
      cells.push({ key, v: byDay.get(key) ?? 0, future: ts > today.getTime() })
    }
  }
  return cells
})

const max = computed(() => Math.max(1, ...grid.value.map(c => c.v)))
function level(v: number) {
  if (v <= 0) return 0
  const r = v / max.value
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1
}
const total = computed(() => props.items.length)
</script>

<template>
  <div class="overflow-x-auto pb-1">
    <div class="inline-grid grid-flow-col grid-rows-7 gap-[3px]" :style="{ direction: 'ltr' }">
      <div
        v-for="c in grid" :key="c.key"
        class="w-[10px] h-[10px] rounded-[2px] relative group"
        :class="c.future ? 'opacity-0' : level(c.v) === 0 ? 'bg-border/60' : 'heat-' + level(c.v)"
      >
        <span
          v-if="!c.future && c.v > 0"
          class="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block whitespace-nowrap rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-soft z-10"
        >{{ c.key }} · {{ Math.round(c.v * 10) / 10 }}km</span>
      </div>
    </div>
    <p class="mt-2 font-mono text-[11px] text-muted">{{ total }} 次运动 · 近一年</p>
  </div>
</template>

<style scoped>
.heat-1 { background: color-mix(in srgb, var(--accent) 30%, var(--surface)); }
.heat-2 { background: color-mix(in srgb, var(--accent) 55%, var(--surface)); }
.heat-3 { background: color-mix(in srgb, var(--accent) 78%, var(--surface)); }
.heat-4 { background: var(--accent); }
</style>
