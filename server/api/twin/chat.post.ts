import { getGardenChunks, getPostFull } from '../../utils/gardenIndex'
import { hybridTopChunks } from '../../utils/embeddings'
import { streamLLM, hasLLMKey, type ChatMsg } from '../../utils/llm'
import { checkTwinRate, clientIP } from '../../utils/rateLimit'

const PERSONA = `你是这座数字花园主人的数字孪生。规则：
- 只依据下面提供的「花园片段」回答；没有依据时明确说"花园里还没写过这个"
- 语气：直接、具体、偶尔自嘲，避免"作为一个AI"式套话
- 提到某篇文章时用它的标题
- 中文提问用中文答，英文提问用英文答
- 回答控制在 200 字以内，碎念式的短句优先`

function sse(event: unknown, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

export default defineEventHandler(async (event) => {
  const rate = checkTwinRate(clientIP(event))
  if (rate !== 'ok') {
    throw createError({ statusCode: 429, statusMessage: rate === 'daily' ? 'daily limit reached' : 'too fast' })
  }

  const body = await readBody<{ messages: ChatMsg[]; scope?: string }>(event)
  const messages = (body?.messages ?? []).slice(-8)
  const question = messages.filter(m => m.role === 'user').at(-1)?.content ?? ''
  if (!question.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'empty question' })
  }

  const chunks = await getGardenChunks(event)

  // scope=/posts/xxx → 文章级问答：全文注入 + 少量相关片段；否则全站检索
  let system = PERSONA
  let context: string
  let hits: { title: string; path: string; kind: string; text: string }[]

  const scope = typeof body?.scope === 'string' && /^\/posts\/[\w-]+$/.test(body.scope) ? body.scope : null
  const article = scope ? await getPostFull(event, scope) : null

  if (article && scope) {
    const related = await hybridTopChunks(chunks.filter(c => c.path !== scope), question, 2)
    hits = [
      { title: article.title, path: scope, kind: 'post', text: '' },
      ...related,
    ]
    system += `\n- 访客此刻正在阅读《${article.title}》，优先针对这篇文章回答；「当前文章」全文已提供`
    context = `=== 当前文章 ===\n《${article.title}》(${scope}, ${article.date})\n${article.text.slice(0, 7000)}`
    if (related.length) {
      context += `\n\n=== 花园其他相关片段 ===\n${related
        .map((h, i) => `[${i + 1}] 《${h.title}》(${h.path})\n${h.text.slice(0, 500)}`)
        .join('\n\n')}`
    }
  } else {
    const top = await hybridTopChunks(chunks, question, 4)
    hits = top
    context = top
      .map((h, i) => `[${i + 1}] 《${h.title}》(${h.path}, ${'date' in h ? (h as { date: string }).date : ''})\n${h.text.slice(0, 900)}`)
      .join('\n\n')
  }

  setHeader(event, 'content-type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')

  const res = event.node.res
  res.write(sse('sources', hits.map(h => ({ title: h.title, path: h.path, kind: h.kind }))))

  const provider = await streamLLM(
    { system: `${system}\n\n=== 花园片段 ===\n${context}`, messages, maxTokens: 600, temperature: 0.4 },
    delta => res.write(sse('delta', delta)),
  )

  if (provider) {
    res.write(sse('done', { mode: 'live', provider }))
    res.end()
    return
  }

  // 降级：有 key 但上游全部失败（多为免费档限流）↔ 无 key 演示模式
  const isEn = /^[\x00-\x7F\s]*$/.test(question)
  const retrieval = hits.filter(h => h.text)
  const intro = hasLLMKey()
    ? (isEn
        ? `[rate limited] The twin's inference quota is momentarily exhausted — retry in a minute. Meanwhile, what the garden knows:\n\n`
        : `[限流中] 孪生的推理配额暂时用尽，一分钟后再试。先给你检索到的内容：\n\n`)
    : (isEn
        ? `[demo mode] No inference key on the server yet, but retrieval works — here is what the garden knows:\n\n`
        : `[演示模式] 服务器还没配推理 key，但检索是真的——花园里与你的问题最相关的内容：\n\n`)
  const bodyText = retrieval.length
    ? retrieval.map((h, i) => `${i + 1}. 《${h.title}》— ${h.text.slice(0, 80)}…`).join('\n')
    : (isEn ? 'Nothing planted on this topic yet.' : '这个话题花园里还没种下过内容。')

  const full = intro + bodyText
  for (let i = 0; i < full.length; i += 3) {
    res.write(sse('delta', full.slice(i, i + 3)))
    await new Promise(r => setTimeout(r, 18))
  }
  res.write(sse('done', { mode: hasLLMKey() ? 'degraded' : 'demo' }))
  res.end()
})
