<script setup lang="ts">
const { open, hide } = usePalette()
const { lang, t, toggle: toggleLang } = useLang()
const { toggle: toggleTheme } = useTheme()
const router = useRouter()

interface Entry {
  type: 'post' | 'tweet' | 'media' | 'page' | 'action'
  title: string
  hint?: string
  text: string
  path?: string
  run?: () => void
}

const query = ref('')
const active = ref(0)
const inputEl = ref<HTMLInputElement>()
const index = ref<Entry[]>([])
let loaded = false

async function buildIndex() {
  if (loaded) return
  loaded = true
  const [posts, tweets, media] = await Promise.all([
    queryCollection('posts').where('draft', '=', false).order('date', 'DESC').all(),
    queryCollection('tweets').order('num', 'DESC').all(),
    queryCollection('media').order('date', 'DESC').all(),
  ])
  const entries: Entry[] = []
  for (const p of posts) {
    entries.push({
      type: 'post', title: p.title ?? '', path: p.path,
      hint: (p.tags as string[] | undefined)?.map(x => `#${x}`).join(' '),
      text: `${p.title} ${p.description} ${(p.tags as string[] | undefined)?.join(' ')}`.toLowerCase(),
    })
  }
  for (const tw of tweets) {
    entries.push({
      type: 'tweet', title: tw.text.slice(0, 60), path: '/tweets', hint: `# ${tw.num}`,
      text: tw.text.toLowerCase(),
    })
  }
  for (const m of media) {
    entries.push({
      type: 'media', title: m.title, path: '/media', hint: m.kind,
      text: `${m.title} ${m.note}`.toLowerCase(),
    })
  }
  index.value = entries
}

const actions = computed<Entry[]>(() => [
  { type: 'page', title: t.value.posts, path: '/posts', text: 'posts 文章' },
  { type: 'page', title: t.value.tweets, path: '/tweets', text: 'tweets 碎念 notes' },
  { type: 'page', title: t.value.media, path: '/media', text: 'media 媒体' },
  { type: 'page', title: '归档 Archive', path: '/archive', text: 'archive 归档 年份' },
  { type: 'page', title: t.value.about, path: '/about', text: 'about 关于' },
  { type: 'action', title: '切换主题 Toggle theme', text: 'theme dark light 主题 暗色 亮色', run: toggleTheme },
  { type: 'action', title: lang.value === 'zh' ? 'Switch to English' : '切换到中文', text: 'language lang 语言 english 中文', run: toggleLang },
])

const results = computed<Entry[]>(() => {
  const q = query.value.trim().toLowerCase()
  const pool = [...actions.value, ...index.value]
  if (!q) return pool.slice(0, 9)
  const terms = q.split(/\s+/)
  return pool
    .map((e) => {
      let score = 0
      for (const term of terms) {
        if (e.title.toLowerCase().includes(term)) score += 3
        else if (e.text.includes(term)) score += 1
        else return null
      }
      return { e, score }
    })
    .filter((x): x is { e: Entry; score: number } => !!x)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map(x => x.e)
})

watch(results, () => (active.value = 0))
watch(open, async (v) => {
  if (v) {
    query.value = ''
    buildIndex()
    await nextTick()
    inputEl.value?.focus()
  }
})

function pick(e: Entry) {
  hide()
  if (e.run) e.run()
  else if (e.path) router.push(e.path)
}

function onKey(ev: KeyboardEvent) {
  if (ev.key === 'ArrowDown') { ev.preventDefault(); active.value = (active.value + 1) % results.value.length }
  else if (ev.key === 'ArrowUp') { ev.preventDefault(); active.value = (active.value - 1 + results.value.length) % results.value.length }
  else if (ev.key === 'Enter') { const e = results.value[active.value]; if (e) pick(e) }
  else if (ev.key === 'Escape') hide()
}

const typeBadge: Record<string, string> = {
  post: 'post', tweet: 'tweet', media: 'media', page: 'goto', action: 'run',
}
</script>

<template>
  <Teleport to="body">
    <Transition name="palette">
      <div v-if="open" class="fixed inset-0 z-[100]" @keydown="onKey">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-[3px]" @click="hide" />
        <div class="palette-panel relative mx-auto mt-[14vh] w-[min(92vw,600px)] rounded-xl border border-border-strong bg-surface shadow-2xl shadow-black/40 overflow-hidden">
          <div class="flex items-center gap-3 border-b border-border px-4">
            <span class="font-mono text-accent select-none">$</span>
            <input
              ref="inputEl"
              v-model="query"
              type="text"
              :placeholder="lang === 'zh' ? 'grep 花园里的一切…' : 'grep the whole garden…'"
              class="w-full bg-transparent py-3.5 font-mono text-sm text-ink outline-none placeholder:text-muted"
            >
            <kbd class="font-mono text-[10px] text-muted border border-border rounded px-1.5 py-0.5">esc</kbd>
          </div>

          <div class="max-h-[46vh] overflow-y-auto py-2">
            <div v-if="!results.length" class="px-4 py-8 text-center font-mono text-sm text-muted">
              grep: no matches found
            </div>
            <button
              v-for="(e, i) in results" :key="`${e.type}-${e.title}-${i}`"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors"
              :class="i === active ? 'bg-accent-soft' : 'hover:bg-surface-hover'"
              @click="pick(e)"
              @mousemove="active = i"
            >
              <span
                class="font-mono text-[10px] uppercase tracking-wide rounded border px-1.5 py-0.5 shrink-0"
                :class="i === active ? 'border-accent text-accent' : 'border-border text-muted'"
              >{{ typeBadge[e.type] }}</span>
              <span class="min-w-0 flex-1 truncate text-sm" :class="i === active ? 'text-ink' : 'text-ink-soft'">{{ e.title }}</span>
              <span v-if="e.hint" class="font-mono text-[11px] text-muted shrink-0">{{ e.hint }}</span>
            </button>
          </div>

          <div class="flex items-center gap-4 border-t border-border px-4 py-2 font-mono text-[11px] text-muted">
            <span><kbd>↑↓</kbd> {{ lang === 'zh' ? '导航' : 'move' }}</span>
            <span><kbd>↵</kbd> {{ lang === 'zh' ? '打开' : 'open' }}</span>
            <span class="ml-auto text-accent/70">~/garden index</span>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.palette-enter-active { transition: opacity 0.16s ease; }
.palette-enter-active .palette-panel { transition: transform 0.16s cubic-bezier(0.2, 0, 0, 1), opacity 0.16s ease; }
.palette-leave-active { transition: opacity 0.12s ease; }
.palette-enter-from { opacity: 0; }
.palette-enter-from .palette-panel { transform: scale(0.97) translateY(-8px); }
.palette-leave-to { opacity: 0; }
</style>
