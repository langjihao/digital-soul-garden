<script setup lang="ts">
const { open, toggle, hide } = useTwin()
const { lang } = useLang()

interface Source { title: string; path: string; kind: string }
interface Msg { role: 'user' | 'assistant'; content: string; sources?: Source[]; streaming?: boolean }

const messages = ref<Msg[]>([])
const input = ref('')
const busy = ref(false)
const listEl = ref<HTMLElement>()

const suggestions = computed(() =>
  lang.value === 'zh'
    ? ['混合检索是怎么做的？', '为什么把 Git 当 CMS？', '你最近在读什么？']
    : ['How does hybrid search work?', 'Why Git as a CMS?', 'What are you reading lately?'],
)

async function scrollToEnd() {
  await nextTick()
  listEl.value?.scrollTo({ top: listEl.value.scrollHeight, behavior: 'smooth' })
}

async function send(text?: string) {
  const q = (text ?? input.value).trim()
  if (!q || busy.value) return
  input.value = ''
  busy.value = true
  messages.value.push({ role: 'user', content: q })
  const reply: Msg = reactive({ role: 'assistant', content: '', sources: [], streaming: true })
  messages.value.push(reply)
  scrollToEnd()

  try {
    const res = await fetch('/api/twin/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        messages: messages.value.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
      }),
    })
    if (!res.ok || !res.body) throw new Error(`${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      // parse SSE frames
      const frames = buf.split('\n\n')
      buf = frames.pop() ?? ''
      for (const frame of frames) {
        const evLine = frame.split('\n').find(l => l.startsWith('event: '))
        const dataLine = frame.split('\n').find(l => l.startsWith('data: '))
        if (!evLine || !dataLine) continue
        const ev = evLine.slice(7).trim()
        const data = JSON.parse(dataLine.slice(6))
        if (ev === 'sources') reply.sources = data
        else if (ev === 'delta') { reply.content += data; scrollToEnd() }
      }
    }
  } catch {
    reply.content ||= lang.value === 'zh' ? '孪生暂时失联了，稍后再试。' : 'The twin is unreachable right now.'
  } finally {
    reply.streaming = false
    busy.value = false
    scrollToEnd()
  }
}
</script>

<template>
  <!-- floating toggle button -->
  <button
    class="twin-fab fixed bottom-5 right-5 z-[90] flex h-12 w-12 items-center justify-center rounded-full border border-border-strong bg-surface text-accent shadow-lg shadow-black/30 transition-all hover:scale-105 hover:shadow-[var(--glow)]"
    :title="lang === 'zh' ? '与孪生对话' : 'Talk to the twin'"
    @click="toggle()"
  >
    <svg v-if="!open" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="7" width="14" height="12" rx="2"/><path d="M12 3v4M8 12h.01M16 12h.01M9 16h6"/></svg>
    <svg v-else class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
    <span v-if="!open" class="absolute top-1 right-1 h-2 w-2 rounded-full bg-accent animate-pulse" />
  </button>

  <!-- chat panel -->
  <Transition name="twin">
    <div
      v-if="open"
      class="twin-panel fixed bottom-20 right-5 z-[89] flex w-[min(94vw,390px)] flex-col overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl shadow-black/50"
      style="height: min(72vh, 560px)"
    >
      <header class="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span class="font-mono text-sm text-accent">./digital_twin</span>
        <span class="font-mono text-[10px] text-muted">--rag --stream</span>
        <button class="ml-auto text-muted hover:text-ink transition-colors" @click="hide()">
          <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      </header>

      <div ref="listEl" class="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div v-if="!messages.length" class="space-y-3">
          <p class="text-sm leading-relaxed text-ink-soft">
            {{ lang === 'zh' ? '我是这座花园的数字孪生，读过这里的每一篇文章和碎念。' : 'I am the twin of this garden — I have read every post and note here.' }}
          </p>
          <button
            v-for="s in suggestions" :key="s"
            class="block w-full rounded-lg border border-border px-3 py-2 text-left font-mono text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            @click="send(s)"
          >$ {{ s }}</button>
        </div>

        <div v-for="(m, i) in messages" :key="i" class="flex" :class="m.role === 'user' ? 'justify-end' : ''">
          <div
            class="max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
            :class="m.role === 'user'
              ? 'bg-accent-soft text-ink border border-accent/30'
              : 'bg-bg-soft text-ink-soft border border-border'"
          >{{ m.content }}<span v-if="m.streaming" class="caret" /><template v-if="m.role === 'assistant' && m.sources?.length && !m.streaming">
              <span class="mt-2 flex flex-wrap gap-1.5 border-t border-border pt-2">
                <NuxtLink
                  v-for="s in m.sources" :key="s.path + s.title" :to="s.path"
                  class="font-mono text-[10px] text-muted hover:text-accent border border-border rounded px-1.5 py-0.5 transition-colors"
                  @click="hide()"
                >{{ s.kind }} · {{ s.title.slice(0, 18) }}</NuxtLink>
              </span>
            </template></div>
        </div>
      </div>

      <footer class="border-t border-border p-3">
        <form class="flex items-center gap-2" @submit.prevent="send()">
          <span class="font-mono text-accent text-sm select-none pl-1">$</span>
          <input
            v-model="input"
            type="text"
            :placeholder="lang === 'zh' ? '向孪生提问…' : 'ask the twin…'"
            class="w-full bg-transparent font-mono text-sm text-ink outline-none placeholder:text-muted"
            :disabled="busy"
          >
          <button
            type="submit"
            class="pressable shrink-0 rounded-md border border-border-strong px-2.5 py-1.5 font-mono text-xs text-ink-soft transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
            :disabled="busy || !input.trim()"
          >{{ busy ? '…' : '↵' }}</button>
        </form>
      </footer>
    </div>
  </Transition>
</template>

<style scoped>
.twin-enter-active { transition: transform 0.22s cubic-bezier(0.2, 0, 0, 1), opacity 0.22s ease; }
.twin-leave-active { transition: transform 0.16s ease, opacity 0.16s ease; }
.twin-enter-from, .twin-leave-to { transform: translateY(14px) scale(0.98); opacity: 0; }
</style>
