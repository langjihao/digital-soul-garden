export interface ChatMsg { role: 'user' | 'assistant'; content: string }

interface LlmOpts {
  system: string
  messages: ChatMsg[]
  maxTokens?: number
  temperature?: number
}

class UpstreamError extends Error {
  constructor(public status: number, public partial = false) {
    super(`upstream ${status}`)
  }
}

// 免费档 RPM: gemini-3.5-flash=5, gemini-2.5-flash-lite=10 —— 429 时自动降档
function geminiModels(): string[] {
  const primary = process.env.GEMINI_MODEL || 'gemini-3.5-flash'
  const lite = process.env.GEMINI_MODEL_LITE || 'gemini-2.5-flash-lite'
  return primary === lite ? [primary] : [primary, lite]
}

// OpenRouter 免费池上游限流频繁，按序尝试多个模型；逗号分隔可配
function openRouterModels(): string[] {
  return (process.env.OPENROUTER_MODELS
    || 'qwen/qwen3-next-80b-a3b-instruct:free,nvidia/nemotron-3-super-120b-a12b:free')
    .split(',').map(s => s.trim()).filter(Boolean)
}

function toOpenAIBody(model: string, opts: LlmOpts, stream: boolean) {
  return {
    model,
    stream,
    max_tokens: opts.maxTokens ?? 600,
    temperature: opts.temperature ?? 0.4,
    messages: [{ role: 'system', content: opts.system }, ...opts.messages],
  }
}

const OR_HEADERS = (key: string) => ({
  'Authorization': `Bearer ${key}`,
  'content-type': 'application/json',
  'HTTP-Referer': 'https://blog.iqiqiqi.me',
  'X-Title': 'garden digital twin',
})

async function streamOpenRouter(key: string, model: string, opts: LlmOpts, onDelta: (t: string) => void) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: OR_HEADERS(key),
    body: JSON.stringify(toOpenAIBody(model, opts, true)),
  })
  if (!res.ok || !res.body) throw new UpstreamError(res.status)
  let emitted = false
  try {
    for await (const evt of sseJson(res.body)) {
      // 流中途的错误帧（上游限流常以 200 流 + error 帧出现）
      if ((evt as { error?: unknown }).error) throw new Error('stream error')
      const delta = (evt as { choices?: { delta?: { content?: unknown } }[] })?.choices?.[0]?.delta?.content
      if (typeof delta === 'string' && delta) { emitted = true; onDelta(delta) }
    }
  } catch { throw new UpstreamError(0, emitted) }
  if (!emitted) throw new UpstreamError(-1)
}

function toGeminiBody(opts: LlmOpts) {
  return {
    systemInstruction: { parts: [{ text: opts.system }] },
    contents: opts.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      maxOutputTokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.4,
      // gemini-3.5/2.5 默认开思考，会把 token 预算全部烧在思考上导致正文为空
      thinkingConfig: { thinkingBudget: Number(process.env.GEMINI_THINKING_BUDGET ?? 0) },
    },
  }
}

async function streamAnthropic(key: string, opts: LlmOpts, onDelta: (t: string) => void) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: process.env.TWIN_MODEL || 'claude-haiku-4-5-20251001',
      max_tokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.4,
      stream: true,
      system: opts.system,
      messages: opts.messages,
    }),
  })
  if (!res.ok || !res.body) throw new UpstreamError(res.status)
  let emitted = false
  try {
    for await (const evt of sseJson(res.body)) {
      const delta = (evt as { delta?: { text?: unknown } })?.delta?.text
      if (typeof delta === 'string') { emitted = true; onDelta(delta) }
    }
  } catch { throw new UpstreamError(0, emitted) }
}

async function streamGemini(key: string, model: string, opts: LlmOpts, onDelta: (t: string) => void) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(toGeminiBody(opts)) },
  )
  if (!res.ok || !res.body) throw new UpstreamError(res.status)
  let emitted = false
  try {
    for await (const evt of sseJson(res.body)) {
      const parts = (evt as { candidates?: { content?: { parts?: { text?: unknown; thought?: boolean }[] } }[] })
        ?.candidates?.[0]?.content?.parts ?? []
      for (const p of parts) {
        if (p.thought) continue
        if (typeof p.text === 'string') { emitted = true; onDelta(p.text) }
      }
    }
  } catch { throw new UpstreamError(0, emitted) }
  // 流正常结束但没有任何正文（如思考耗尽预算）→ 视为失败，让上层降档
  if (!emitted) throw new UpstreamError(-1)
}

// parse "data: {...}" SSE frames into JSON objects
async function* sseJson(body: ReadableStream<Uint8Array>) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      try { yield JSON.parse(line.slice(6)) } catch { /* keepalive / [DONE] */ }
    }
  }
}

/**
 * 流式推理，按 provider 链依次尝试：OpenRouter 免费池（多模型）→ Anthropic → Gemini 主 → Gemini lite。
 * 返回成功的 provider 标识；全部不可用返回 null（由调用方走检索降级）。
 * 若某 provider 已输出部分内容后中断，不再切换（避免重复输出），按成功返回。
 */
export async function streamLLM(opts: LlmOpts, onDelta: (t: string) => void): Promise<string | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (openRouterKey) {
    for (const model of openRouterModels()) {
      try {
        await streamOpenRouter(openRouterKey, model, opts, onDelta)
        return `openrouter:${model}`
      } catch (e) {
        if (e instanceof UpstreamError && e.partial) return `openrouter:${model}`
        if (e instanceof UpstreamError && ![429, 500, 502, 503, 408, 0, -1].includes(e.status)) break
      }
    }
  }
  if (anthropicKey) {
    try {
      await streamAnthropic(anthropicKey, opts, onDelta)
      return 'anthropic'
    } catch (e) {
      if (e instanceof UpstreamError && e.partial) return 'anthropic'
    }
  }
  if (geminiKey) {
    for (const model of geminiModels()) {
      try {
        await streamGemini(geminiKey, model, opts, onDelta)
        return `gemini:${model}`
      } catch (e) {
        if (e instanceof UpstreamError && e.partial) return `gemini:${model}`
        // 429/5xx/空输出 → 降档到下一个模型；其他错误（如 400）没有重试意义
        if (e instanceof UpstreamError && ![429, 500, 503, 0, -1].includes(e.status)) break
      }
    }
  }
  return null
}

/** 非流式推理，同一条 provider 链。返回 { text, provider } 或 null。 */
export async function completeLLM(opts: LlmOpts): Promise<{ text: string; provider: string } | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY

  if (openRouterKey) {
    for (const model of openRouterModels()) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: OR_HEADERS(openRouterKey),
          body: JSON.stringify(toOpenAIBody(model, { ...opts, maxTokens: opts.maxTokens ?? 300, temperature: opts.temperature ?? 0.2 }, false)),
        })
        if (!res.ok) {
          if ([429, 500, 502, 503, 408].includes(res.status)) continue
          break
        }
        const data = await res.json()
        if (data?.error) continue
        const text = data?.choices?.[0]?.message?.content
        if (typeof text === 'string' && text.trim()) return { text: text.trim(), provider: `openrouter:${model}` }
      } catch { /* try next model */ }
    }
  }
  if (anthropicKey) {
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: process.env.TWIN_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: opts.maxTokens ?? 300,
          temperature: opts.temperature ?? 0.2,
          system: opts.system,
          messages: opts.messages,
        }),
      })
      const data = await res.json()
      const text = data?.content?.[0]?.text
      if (typeof text === 'string' && text.trim()) return { text: text.trim(), provider: 'anthropic' }
    } catch { /* fall through */ }
  }
  if (geminiKey) {
    for (const model of geminiModels()) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(toGeminiBody({ ...opts, temperature: opts.temperature ?? 0.2, maxTokens: opts.maxTokens ?? 300 })),
          },
        )
        if (!res.ok) {
          if ([429, 500, 503].includes(res.status)) continue
          break
        }
        const data = await res.json()
        const parts = data?.candidates?.[0]?.content?.parts ?? []
        const text = parts.filter((p: { thought?: boolean }) => !p.thought).map((p: { text?: string }) => p.text ?? '').join('')
        if (text.trim()) return { text: text.trim(), provider: `gemini:${model}` }
      } catch { /* try next model */ }
    }
  }
  return null
}

export function hasLLMKey(): boolean {
  return !!(process.env.OPENROUTER_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY)
}
