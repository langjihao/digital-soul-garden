import { createHash } from 'node:crypto'
import type { GardenChunk } from './gardenIndex'
import { lexicalScores, topChunks } from './gardenIndex'
import { readShared, writeShared } from './sharedStore'

// 混合检索：词法打分（BM25 味的 2-gram）+ gemini-embedding 余弦，等权合并。
// 任一环节失败（无 key / 429 / 网络）都静默退回纯词法，检索永远可用。

const EMBED_MODEL = 'gemini-embedding-001'
const DIM = 768 // matryoshka 截断：768 维对个位数文章的库绰绰有余，存储/点积都省
const CACHE_FILE = 'embeddings.json'

type VecCache = Record<string, number[]>
let cache: VecCache | null = null
let queryMemo = new Map<string, number[]>()

function chunkKey(c: GardenChunk): string {
  return createHash('sha1').update(`${c.kind}|${c.path}|${c.text}`).digest('hex')
}

function normalize(v: number[]): number[] {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1
  return v.map(x => x / n)
}

function dot(a: number[], b: number[]): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!
  return s
}

async function embedBatch(texts: string[], taskType: string): Promise<number[][]> {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('no key')
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${EMBED_MODEL}:batchEmbedContents?key=${key}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        requests: texts.map(text => ({
          model: `models/${EMBED_MODEL}`,
          content: { parts: [{ text: text.slice(0, 6000) }] },
          taskType,
          outputDimensionality: DIM,
        })),
      }),
    },
  )
  if (!res.ok) throw new Error(`embed ${res.status}`)
  const data = await res.json()
  const vecs = (data?.embeddings ?? []).map((e: { values: number[] }) => normalize(e.values))
  if (vecs.length !== texts.length) throw new Error('embed count mismatch')
  return vecs
}

// 文档向量：内容哈希做 key，只嵌入新增/变更的 chunk，落盘跨重启复用
async function getChunkVectors(chunks: GardenChunk[]): Promise<Map<GardenChunk, number[]>> {
  if (!cache) cache = await readShared<VecCache>(CACHE_FILE, {})

  const missing = chunks.filter(c => !cache![chunkKey(c)])
  if (missing.length) {
    const vecs = await embedBatch(missing.map(c => c.text), 'RETRIEVAL_DOCUMENT')
    missing.forEach((c, i) => { cache![chunkKey(c)] = vecs[i]! })
    void writeShared(CACHE_FILE, cache)
  }
  return new Map(chunks.map(c => [c, cache![chunkKey(c)]!]))
}

export async function hybridTopChunks(chunks: GardenChunk[], query: string, k = 4): Promise<GardenChunk[]> {
  try {
    const q = query.trim().slice(0, 500)
    let qv = queryMemo.get(q)
    if (!qv) {
      qv = (await embedBatch([q], 'RETRIEVAL_QUERY'))[0]!
      if (queryMemo.size > 200) queryMemo = new Map()
      queryMemo.set(q, qv)
    }
    const vectors = await getChunkVectors(chunks)

    const lex = lexicalScores(chunks, query)
    const lexMax = Math.max(...lex, 1)

    return chunks
      .map((c, i) => {
        const cos = Math.max(0, dot(qv!, vectors.get(c)!))
        return { c, score: 0.5 * (lex[i]! / lexMax) + 0.5 * cos }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .filter(x => x.score > 0.15) // 双路都近乎无关的不硬凑
      .map(x => x.c)
  } catch {
    return topChunks(chunks, query, k)
  }
}
