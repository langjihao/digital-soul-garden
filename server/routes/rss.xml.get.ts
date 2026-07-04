import { queryCollection } from '@nuxt/content/server'

const SITE = 'https://blog.iqiqiqi.me'

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, 'posts')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .all()

  const items = posts
    .map(p => `  <item>
    <title>${esc(p.title ?? '')}</title>
    <link>${SITE}${p.path}</link>
    <guid>${SITE}${p.path}</guid>
    <pubDate>${new Date(p.date as string).toUTCString()}</pubDate>
    <description>${esc(p.description ?? '')}</description>
    ${((p.tags as string[] | undefined) ?? []).map(t => `<category>${esc(t)}</category>`).join('')}
  </item>`)
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
  <title>~/garden — 数字花园</title>
  <link>${SITE}</link>
  <description>一座被索引、可检索的数字花园。</description>
  <language>zh-CN</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>`

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  return xml
})
