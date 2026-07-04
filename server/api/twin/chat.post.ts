import { getGardenChunks, topChunks } from '../../utils/gardenIndex'

interface ChatMessage { role: 'user' | 'assistant'; content: string }

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
  const body = await readBody<{ messages: ChatMessage[] }>(event)
  const messages = (body?.messages ?? []).slice(-8)
  const question = messages.filter(m => m.role === 'user').at(-1)?.content ?? ''
  if (!question.trim()) {
    throw createError({ statusCode: 400, statusMessage: 'empty question' })
  }

  const chunks = await getGardenChunks(event)
  const hits = topChunks(chunks, question, 4)
  const context = hits
    .map((h, i) => `[${i + 1}] 《${h.title}》(${h.path}, ${h.date})\n${h.text.slice(0, 900)}`)
    .join('\n\n')

  setHeader(event, 'content-type', 'text/event-stream; charset=utf-8')
  setHeader(event, 'cache-control', 'no-cache')
  setHeader(event, 'connection', 'keep-alive')

  const res = event.node.res
  res.write(sse('sources', hits.map(h => ({ title: h.title, path: h.path, kind: h.kind }))))

  const apiKey = process.env.ANTHROPIC_API_KEY
  const model = process.env.TWIN_MODEL || 'claude-haiku-4-5-20251001'

  if (apiKey) {
    // real mode: stream from Anthropic Messages API
    try {
      const upstream = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          max_tokens: 600,
          temperature: 0.4,
          stream: true,
          system: `${PERSONA}\n\n=== 花园片段 ===\n${context}`,
          messages,
        }),
      })
      if (!upstream.ok || !upstream.body) throw new Error(`upstream ${upstream.status}`)

      const reader = upstream.body.getReader()
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
          try {
            const evt = JSON.parse(line.slice(6))
            const delta = evt?.delta?.text
            if (typeof delta === 'string') res.write(sse('delta', delta))
          } catch { /* keepalives etc. */ }
        }
      }
      res.write(sse('done', { mode: 'live' }))
    } catch {
      res.write(sse('delta', '（孪生的推理服务暂时不可用，稍后再试。）'))
      res.write(sse('done', { mode: 'error' }))
    }
    res.end()
    return
  }

  // demo mode: stream a retrieval-grounded canned answer so UX is fully exercisable
  const isEn = /^[\x00-\x7F\s]*$/.test(question)
  const intro = isEn
    ? `[demo mode] No inference key on the server yet, but retrieval works — here is what the garden knows:\n\n`
    : `[演示模式] 服务器还没配推理 key，但检索是真的——花园里与你的问题最相关的内容：\n\n`
  const bodyText = hits.length
    ? hits.map((h, i) => `${i + 1}. 《${h.title}》— ${h.text.slice(0, 80)}…`).join('\n')
    : (isEn ? 'Nothing planted on this topic yet.' : '这个话题花园里还没种下过内容。')
  const outro = isEn
    ? `\n\nSet ANTHROPIC_API_KEY in /etc/garden.env to wake the real twin.`
    : `\n\n在服务器配置 ANTHROPIC_API_KEY 后，孪生就会用真实推理与你对话。`

  const full = intro + bodyText + outro
  for (let i = 0; i < full.length; i += 3) {
    res.write(sse('delta', full.slice(i, i + 3)))
    await new Promise(r => setTimeout(r, 18))
  }
  res.write(sse('done', { mode: 'demo' }))
  res.end()
})
