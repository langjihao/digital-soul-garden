import { queryCollection } from '@nuxt/content/server'

const SITE = 'https://blog.iqiqiqi.me'

export default defineEventHandler(async (event) => {
  const posts = await queryCollection(event, 'posts')
    .where('draft', '=', false)
    .order('date', 'DESC')
    .all()

  const staticPaths = ['/', '/posts', '/tweets', '/media', '/about', '/archive']
  const urls = [
    ...staticPaths.map(p => `  <url><loc>${SITE}${p}</loc></url>`),
    ...posts.map(p => `  <url><loc>${SITE}${p.path}</loc><lastmod>${new Date(p.date as string).toISOString().slice(0, 10)}</lastmod></url>`),
  ].join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return xml
})
