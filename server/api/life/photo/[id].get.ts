import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { albumConfigured, albumToken } from '../../../utils/life/album'

// 相册媒体代理：花园服务端持凭证向相册后台取图，磁盘缓存（asset 内容不可变）
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

const extOf: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
}

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id') ?? ''
  if (!UUID_RE.test(id)) throw createError({ statusCode: 400 })
  if (!albumConfigured()) throw createError({ statusCode: 404 })

  const dir = join(process.env.LIFE_DATA_DIR || join(process.cwd(), '.data'), 'photos')
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')

  // 磁盘缓存命中（扩展名未知，逐个探测常见类型）
  for (const [mime, ext] of Object.entries(extOf)) {
    try {
      const buf = await readFile(join(dir, `${id}.${ext}`))
      setHeader(event, 'content-type', mime)
      return buf
    } catch {}
  }

  const token = await albumToken()
  const res = await fetch(`${(process.env.ALBUM_API_URL || '').replace(/\/$/, '')}/media/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw createError({ statusCode: res.status === 404 ? 404 : 502 })
  const mime = res.headers.get('content-type') || 'image/webp'
  const buf = Buffer.from(await res.arrayBuffer())
  setHeader(event, 'content-type', mime)
  const ext = extOf[mime.split(';')[0]!] ?? 'bin'
  await mkdir(dir, { recursive: true }).catch(() => {})
  await writeFile(join(dir, `${id}.${ext}`), buf).catch(() => {})
  return buf
})
