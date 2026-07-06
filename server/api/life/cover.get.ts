import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// 豆瓣图床防盗链要求 douban.com referer（2026-07 起无 referer 也 418），
// 浏览器无法伪造 referer，因此服务端代理 + 磁盘缓存（封面基本不变，缓存永久有效）
const ALLOWED = /^img\d+\.doubanio\.com$/

const contentTypes: Record<string, string> = {
  webp: 'image/webp',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

export default defineEventHandler(async (event) => {
  const u = getQuery(event).u
  if (typeof u !== 'string') throw createError({ statusCode: 400 })
  let url: URL
  try {
    url = new URL(u)
  } catch {
    throw createError({ statusCode: 400 })
  }
  if (url.protocol !== 'https:' || !ALLOWED.test(url.hostname))
    throw createError({ statusCode: 403, statusMessage: 'host not allowed' })

  const ext = url.pathname.split('.').pop()?.toLowerCase() ?? 'webp'
  const type = contentTypes[ext] ?? 'image/webp'
  const dir = join(process.env.LIFE_DATA_DIR || join(process.cwd(), '.data'), 'covers')
  const file = join(dir, createHash('md5').update(u).digest('hex') + '.' + ext)

  setHeader(event, 'content-type', type)
  setHeader(event, 'cache-control', 'public, max-age=31536000, immutable')

  try {
    return await readFile(file)
  } catch {}

  const buf = Buffer.from(
    await $fetch<ArrayBuffer>(url.href, {
      responseType: 'arrayBuffer',
      headers: {
        referer: 'https://movie.douban.com/',
        'user-agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      retry: 1,
    }),
  )
  await mkdir(dir, { recursive: true }).catch(() => {})
  await writeFile(file, buf).catch(e => console.error('[life] cover cache write failed:', e?.message))
  return buf
})
