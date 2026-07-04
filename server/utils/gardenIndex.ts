import type { H3Event } from 'h3'
import { queryCollection } from '@nuxt/content/server'

export interface GardenChunk {
  kind: 'post' | 'tweet' | 'media'
  title: string
  path: string
  date: string
  text: string
}

let cache: { chunks: GardenChunk[]; at: number } | null = null
const TTL = 60_000 // dev-friendly; content changes get picked up within a minute

// flatten @nuxt/content minimark AST into plain text
function flatten(node: unknown): string {
  if (typeof node === 'string') return node
  if (Array.isArray(node)) {
    // minimark node: [tag, props, ...children]
    if (typeof node[0] === 'string' && node.length >= 2 && typeof node[1] === 'object' && !Array.isArray(node[1])) {
      return node.slice(2).map(flatten).join(' ')
    }
    return node.map(flatten).join(' ')
  }
  if (node && typeof node === 'object' && 'value' in (node as Record<string, unknown>)) {
    return String((node as Record<string, unknown>).value)
  }
  return ''
}

export async function getGardenChunks(event: H3Event): Promise<GardenChunk[]> {
  if (cache && Date.now() - cache.at < TTL) return cache.chunks

  const [posts, tweets, media] = await Promise.all([
    queryCollection(event, 'posts').where('draft', '=', false).order('date', 'DESC').all(),
    queryCollection(event, 'tweets').order('num', 'DESC').all(),
    queryCollection(event, 'media').order('date', 'DESC').all(),
  ])

  const chunks: GardenChunk[] = []
  for (const p of posts) {
    const bodyText = flatten((p.body as { value?: unknown })?.value ?? p.body).replace(/\s+/g, ' ').slice(0, 2400)
    chunks.push({
      kind: 'post',
      title: p.title ?? '',
      path: p.path ?? '',
      date: String(p.date ?? ''),
      text: `${p.title}。${p.description}。标签: ${((p.tags as string[]) ?? []).join(', ')}。${bodyText}`,
    })
  }
  for (const tw of tweets) {
    chunks.push({
      kind: 'tweet',
      title: `碎念 #${tw.num}`,
      path: '/tweets',
      date: String(tw.date),
      text: tw.text,
    })
  }
  for (const m of media) {
    chunks.push({
      kind: 'media',
      title: m.title,
      path: '/media',
      date: String(m.date),
      text: `${m.title}。${m.note}`,
    })
  }

  cache = { chunks, at: Date.now() }
  return chunks
}

// naive lexical scoring: term hits weighted by field + brevity
export function topChunks(chunks: GardenChunk[], query: string, k = 4): GardenChunk[] {
  const terms = query
    .toLowerCase()
    .split(/[\s,，。？?!！、;；:：]+/)
    .flatMap(t => (/^[一-鿿]+$/.test(t) && t.length > 2 ? [...ngrams(t, 2), t] : [t]))
    .filter(t => t.length > 1)
  if (!terms.length) return chunks.slice(0, k)

  return chunks
    .map((c) => {
      const hay = `${c.title} ${c.text}`.toLowerCase()
      let score = 0
      for (const t of terms) {
        if (c.title.toLowerCase().includes(t)) score += 3
        if (hay.includes(t)) score += 1
      }
      return { c, score }
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(x => x.c)
}

function ngrams(s: string, n: number): string[] {
  const out: string[] = []
  for (let i = 0; i + n <= s.length; i++) out.push(s.slice(i, i + n))
  return out
}
