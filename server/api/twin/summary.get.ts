import { createHash } from 'node:crypto'
import { getGardenChunks } from '../../utils/gardenIndex'
import { completeLLM } from '../../utils/llm'
import { readShared, writeShared } from '../../utils/sharedStore'

const STORE = 'summaries.json'
type Entry = { summary: string; mode: string }
let memo: Map<string, Entry> | null = null

export default defineEventHandler(async (event) => {
  const { path } = getQuery(event)
  if (typeof path !== 'string' || !path.startsWith('/posts/')) {
    throw createError({ statusCode: 400, statusMessage: 'bad path' })
  }
  if (!memo) memo = new Map(Object.entries(await readShared<Record<string, Entry>>(STORE, {})))

  const chunks = await getGardenChunks(event)
  const post = chunks.find(c => c.kind === 'post' && c.path === path)
  if (!post) throw createError({ statusCode: 404, statusMessage: 'post not found' })

  // key 含内容哈希：文章一改，旧摘要自动失效
  const key = `${path}#${createHash('sha1').update(post.text).digest('hex').slice(0, 8)}`
  if (memo.has(key)) return memo.get(key)

  const live = await completeLLM({
    system: '你是文章作者的数字孪生。用作者的第一人称口吻，把文章浓缩成 3 条要点（每条一行、以 "▸ " 开头、不超过 40 字）。只输出要点。',
    messages: [{ role: 'user', content: post.text.slice(0, 3000) }],
    maxTokens: 220,
    temperature: 0.2,
  })

  if (live) {
    const result = { summary: live.text, mode: 'live' }
    memo.set(key, result) // 只缓存真实推理结果；降级结果不缓存，限流恢复后自动升级
    void writeShared(STORE, Object.fromEntries(memo)) // 落盘跨重启复用
    return result
  }
  return { summary: demoSummary(post.text), mode: 'demo' }
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
