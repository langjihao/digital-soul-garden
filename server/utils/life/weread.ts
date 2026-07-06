import { createHash } from 'node:crypto'
import type { LifeItem } from './types'

// 微信读书：Cookie 认证（浏览器登录 weread.qq.com 后复制整串 Cookie 到 WEREAD_COOKIE）
const BASE = 'https://i.weread.qq.com'

interface ShelfBook {
  bookId: string
  title: string
  author?: string
  cover?: string
  finishReading?: number // 1=读完
  readUpdateTime?: number // 秒
}

interface ReadDetail {
  readTotalTime?: number // 秒
}

function headers(cookie: string) {
  return {
    cookie,
    'user-agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  }
}

// web 阅读页 URL 需要对 bookId 做变换（算法来自 weread web 前端，经 malinkang/weread2notion 验证）
function calcBookStrId(bookId: string): string {
  const digest = createHash('md5').update(bookId).digest('hex')
  let result = digest.slice(0, 3)
  let code: string
  let transformed: string[]
  if (/^\d+$/.test(bookId)) {
    code = '3'
    transformed = []
    for (let i = 0; i < bookId.length; i += 9)
      transformed.push(parseInt(bookId.slice(i, i + 9), 10).toString(16))
  } else {
    code = '4'
    transformed = [Array.from(bookId).map(c => c.charCodeAt(0).toString(16)).join('')]
  }
  result += code + '2' + digest.slice(-2)
  transformed.forEach((t, i) => {
    result += t.length.toString(16).padStart(2, '0') + t
    if (i < transformed.length - 1) result += 'g'
  })
  if (result.length < 20) result += digest.slice(0, 20 - result.length)
  result += createHash('md5').update(result).digest('hex').slice(0, 3)
  return result
}

export async function syncWeread(cookie: string): Promise<{ items: LifeItem[]; readingHour?: number }> {
  const h = headers(cookie)
  // 先访问主站刷新会话（上游同款做法）
  await $fetch('https://weread.qq.com/', { headers: h, responseType: 'text' }).catch(() => {})

  const shelf = await $fetch<{ books?: ShelfBook[]; errCode?: number; errcode?: number }>(
    `${BASE}/shelf/sync?synckey=0&teenmode=0&album=1&onlyBookid=0`,
    { headers: h },
  )
  const err = shelf.errcode ?? shelf.errCode
  if (err && err < 0) throw new Error(`weread cookie invalid (errcode ${err})`)

  const items: LifeItem[] = (shelf.books ?? []).map(b => ({
    id: `weread:${b.bookId}`,
    source: 'weread' as const,
    kind: 'book' as const,
    title: b.title,
    date: new Date((b.readUpdateTime ?? 0) * 1000).toISOString(),
    status: b.finishReading ? ('done' as const) : ('doing' as const),
    cover: b.cover?.replace('/s_', '/t7_'),
    url: `https://weread.qq.com/web/reader/${calcBookStrId(b.bookId)}`,
    author: b.author,
  }))

  // 总阅读时长（读书数据汇总）
  let readingHour: number | undefined
  try {
    const summary = await $fetch<{ datas?: { readTotal?: ReadDetail }[]; readTimes?: Record<string, number> }>(
      `${BASE}/readdata/summary?synckey=0`,
      { headers: h },
    )
    const totalSec = Object.values(summary.readTimes ?? {}).reduce((s, v) => s + v, 0)
    if (totalSec > 0) readingHour = Math.round(totalSec / 360) / 10
  } catch (e: any) {
    console.error('[life] weread summary failed:', e?.message)
  }
  return { items, readingHour }
}
