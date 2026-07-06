<script setup lang="ts">
import mapData from '~/assets/china-map.json'

interface City { name: string; province: string; x: number; y: number; count: number; last: string }
const props = defineProps<{ cities: City[] }>()

// 与构建脚本一致的墨卡托投影
const { proj } = mapData as any
const mercY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const project = (lon: number, lat: number) => ({
  x: (lon - proj.lon0) * proj.scale,
  y: ((mercY(proj.lat1) - mercY(lat)) * 180) / Math.PI * proj.scale,
})

const dots = computed(() =>
  props.cities.map((c) => {
    const { x, y } = project(c.x, c.y)
    return { ...c, px: x, py: y, r: 3.5 + Math.min(4.5, Math.sqrt(c.count) * 1.3) }
  }),
)

const litProvinces = computed(() => new Set(props.cities.map(c => c.province).filter(Boolean)))
const hovered = ref<string | null>(null)
const hoveredDot = computed(() => dots.value.find(d => d.name === hovered.value))

const fmt = (iso: string) => iso.slice(0, 7).replace('-', '.')
</script>

<template>
  <div>
    <div class="relative rounded-xl border border-border bg-surface overflow-hidden">
      <!-- 网格衬底 -->
      <div
        class="absolute inset-0 opacity-[0.35] pointer-events-none"
        style="background-image: linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px); background-size: 28px 28px"
      />
      <svg :viewBox="mapData.viewBox" class="relative w-full h-auto" role="img" aria-label="旅行地图">
        <defs>
          <radialGradient id="city-glow">
            <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.55" />
            <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
          </radialGradient>
        </defs>

        <!-- 省份 -->
        <path
          v-for="p in mapData.provinces" :key="p.name" :d="p.d"
          class="transition-[fill] duration-500"
          :fill="litProvinces.has(p.name) ? 'color-mix(in srgb, var(--accent) 13%, var(--surface))' : 'color-mix(in srgb, var(--ink) 4%, var(--surface))'"
          stroke="var(--border-strong)" stroke-width="0.6" stroke-linejoin="round"
        >
          <title>{{ p.name }}</title>
        </path>

        <!-- 南海诸岛插框 -->
        <g>
          <rect
            :x="mapData.inset.x - 4" :y="mapData.inset.y - 4" :width="mapData.inset.w + 8" :height="mapData.inset.h + 8"
            fill="none" stroke="var(--border-strong)" stroke-width="0.8" rx="3"
          />
          <path :d="mapData.inset.d" fill="color-mix(in srgb, var(--ink) 10%, var(--surface))" stroke="var(--border-strong)" stroke-width="0.5" />
          <text
            :x="mapData.inset.x + mapData.inset.w / 2" :y="mapData.inset.y + mapData.inset.h - 6"
            text-anchor="middle" fill="var(--muted)" style="font: 9px var(--font-mono, monospace)"
          >南海诸岛</text>
        </g>

        <!-- 点亮的城市 -->
        <g v-for="d in dots" :key="d.name" class="cursor-pointer" @mouseenter="hovered = d.name" @mouseleave="hovered = null">
          <circle :cx="d.px" :cy="d.py" :r="d.r * 3.2" fill="url(#city-glow)" />
          <circle :cx="d.px" :cy="d.py" :r="d.r" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.9" class="city-pulse" :style="{ transformOrigin: `${d.px}px ${d.py}px` }" />
          <circle :cx="d.px" :cy="d.py" :r="2.4" fill="var(--accent)" />
          <!-- 命中区域放大 -->
          <circle :cx="d.px" :cy="d.py" :r="14" fill="transparent" />
        </g>

        <!-- 悬停标签（SVG 内绘制，跟随点位） -->
        <g v-if="hoveredDot" pointer-events="none">
          <rect
            :x="hoveredDot.px + 10" :y="hoveredDot.py - 26"
            :width="hoveredDot.name.length * 11 + hoveredDot.count.toString().length * 7 + 46" height="20" rx="4"
            fill="var(--bg)" stroke="var(--border-strong)" stroke-width="0.7" opacity="0.96"
          />
          <text :x="hoveredDot.px + 18" :y="hoveredDot.py - 12" fill="var(--ink)" style="font: 11px var(--font-mono, monospace)">
            {{ hoveredDot.name }} · {{ hoveredDot.count }}📷 {{ fmt(hoveredDot.last) }}
          </text>
        </g>
      </svg>
    </div>

    <!-- 城市清单 -->
    <div class="mt-3 flex flex-wrap gap-1.5">
      <button
        v-for="c in cities" :key="c.name"
        class="pressable font-mono text-[11px] px-2 py-1 rounded-md border transition-colors"
        :class="hovered === c.name
          ? 'border-accent text-accent bg-accent-soft'
          : 'border-border text-ink-soft hover:border-border-strong'"
        @mouseenter="hovered = c.name" @mouseleave="hovered = null"
      >
        {{ c.name }} <span class="text-muted">×{{ c.count }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
@keyframes city-pulse {
  0% { transform: scale(1); opacity: 0.9; }
  70% { transform: scale(2.1); opacity: 0; }
  100% { transform: scale(2.1); opacity: 0; }
}
.city-pulse { animation: city-pulse 2.4s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .city-pulse { animation: none; }
}
</style>
