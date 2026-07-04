import { getGardenChunks } from '../../utils/gardenIndex'

const memo = new Map<string, { summary: string; mode: string }>()

export default defineEventHandler(async (event) => {
  const { path } = getQuery(event)
  if (typeof path !== 'string' || !path.startsWith('/posts/')) {
    throw createError({ statusCode: 400, statusMessage: 'bad path' })
  }
  if (memo.has(path)) return memo.get(path)

  const chunks = await getGardenChunks(event)
  const post = chunks.find(c => c.kind === 'post' && c.path === path)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'post not found' })

  const apiKey = process.env.ANTHROPIC_API_KEY
  let result: { summary: string; mode: string }

  if (apiKey) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.TWIN_MODEL || 'claude-haiku-4-5-20251001',
          max_tokens: 220,
          temperature: 0.2,
          system: '你是文章作者的数字孪生。用作者的第一人称口吻，把文章浓缩成 3 条要点（每条一行、以 "▸ " 开头、不超过 40 字）。只输出要点。',
          messages: [{ role: 'user', content: post.text.slice(0, 3000) }],
        }),
      })
      const data = await r.json()
      const text = data?.content?.[0]?.text
      if (typeof text !== 'string') throw new Error('bad response')
      result = { summary: text.trim(), mode: 'live' }
    } catch {
      result = { summary: demoSummary(post.text), mode: 'demo' }
    }
  } else {
    result = { summary: demoSummary(post.text), mode: 'demo' }
  }

  memo.set(path, result)
  return result
})

// demo mode: first sentence of description + first two section leads
function demoSummary(text: string): string {
  const sentences = text
    .split(/(?<=[。.!?！？])/)
    .map(s => s.trim())
    .filter(s => s.length > 12 && s.length < 90 && !s.startsWith('标签'))
    .slice(1, 4)
  return sentences.map(s => `▸ ${s}`).join('\n') || '▸ 这篇文章还太短，摘不出要点。'
}
