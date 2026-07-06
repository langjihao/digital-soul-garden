import sharp from 'sharp'
import { queryCollection } from '@nuxt/content/server'

// /og/posts/<slug>.png —— 按文章动态生成终端美学 OG 图（1200×630），内存缓存

const memo = new Map<string, Buffer>()

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// 近似排版：CJK 全宽、ASCII 半宽，按像素宽度折行
function wrap(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  let width = 0
  for (const ch of text) {
    const w = /[ᄀ-￿]/.test(ch) ? fontSize : fontSize * 0.55
    if (width + w > maxWidth) {
      lines.push(line)
      line = ch
      width = w
      if (lines.length === maxLines) break
    } else {
      line += ch
      width += w
    }
  }
  if (lines.length < maxLines && line) lines.push(line)
  else if (lines.length === maxLines) lines[maxLines - 1] = lines[maxLines - 1]!.slice(0, -1) + '…'
  return lines
}

export default defineEventHandler(async (event) => {
  const raw = getRouterParam(event, 'slug') ?? ''
  if (!raw.endsWith('.png')) throw createError({ statusCode: 404, statusMessage: 'not found' })
  const slug = raw.slice(0, -4)
  if (!/^[\w-]+$/.test(slug)) throw createError({ statusCode: 404, statusMessage: 'not found' })

  setHeader(event, 'content-type', 'image/png')
  setHeader(event, 'cache-control', 'public, max-age=86400')

  const cached = memo.get(slug)
  if (cached) return cached

  const post = await queryCollection(event, 'posts')
    .where('path', '=', `/posts/${slug}`)
    .where('draft', '=', false)
    .first()
  if (!post) throw createError({ statusCode: 404, statusMessage: 'not found' })

  const title = wrap(post.title ?? '', 58, 1040, 3)
  const desc = wrap(post.description ?? '', 26, 1040, 2)
  const date = String(post.date ?? '').slice(0, 10)
  const font = `font-family="WenQuanYi Zen Hei, sans-serif"`

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
  <rect width="1200" height="630" fill="#0a0f0c"/>
  <g stroke="#1b2a20" stroke-width="1">${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 120}" y1="0" x2="${i * 120}" y2="630"/>`).join('')}${Array.from({ length: 6 }, (_, i) => `<line x1="0" y1="${i * 126}" x2="1200" y2="${i * 126}"/>`).join('')}</g>
  <rect x="40" y="40" width="1120" height="550" rx="18" fill="#0d1410" stroke="#233b2c" stroke-width="2"/>
  <circle cx="86" cy="92" r="9" fill="#2e4636"/><circle cx="116" cy="92" r="9" fill="#2e4636"/><circle cx="146" cy="92" r="9" fill="#4ade80"/>
  <text x="80" y="170" ${font} font-size="24" fill="#5c7a66">$ cat posts/${esc(slug)}.md</text>
  ${title.map((l, i) => `<text x="80" y="${252 + i * 78}" ${font} font-size="58" font-weight="bold" fill="#e8f5ec">${esc(l)}</text>`).join('\n  ')}
  ${desc.map((l, i) => `<text x="80" y="${268 + title.length * 78 + i * 40}" ${font} font-size="26" fill="#7d9c88">${esc(l)}</text>`).join('\n  ')}
  <text x="80" y="546" ${font} font-size="24" fill="#4ade80">~/garden</text>
  <text x="196" y="546" ${font} font-size="22" fill="#5c7a66">数字花园 · ${esc(date)} · blog.iqiqiqi.me</text>
</svg>`

  const png = await sharp(Buffer.from(svg)).png().toBuffer()
  if (memo.size > 100) memo.clear()
  memo.set(slug, png)
  return png
})
