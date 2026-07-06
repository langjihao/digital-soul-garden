import type { LifeItem, LifeStatus } from './types'

// 豆瓣 frodo（小程序后端）公开接口，凭 DOUBAN_NAME（个人主页 ID）即可拉取公开标记
const API_HOST = 'https://frodo.douban.com'
const API_KEY = process.env.DOUBAN_API_KEY || '0ac44ae016490db2204ce0a042db2916'

const headers = {
  'user-agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.16(0x18001023) NetType/WIFI Language/zh_CN',
  referer: 'https://servicewechat.com/wx2f9b06c1de1ccfca/84/page-frame.html',
}

interface FrodoInterest {
  id: number | string
  status: 'mark' | 'doing' | 'done'
  create_time: string
  comment?: string
  rating?: { value: number }
  subject: {
    id: string
    title: string
    url: string
    type: string
    pic?: { normal?: string; large?: string }
    author?: string[]
    directors?: { name: string }[]
    card_subtitle?: string
  }
}

const kindOf = { movie: 'movie', book: 'book', music: 'music' } as const

async function fetchInterests(user: string, type: keyof typeof kindOf, status: LifeStatus) {
  const results: FrodoInterest[] = []
  for (let start = 0; start < 2000; start += 50) {
    const data = await $fetch<{ interests: FrodoInterest[]; total: number }>(
      `${API_HOST}/api/v2/user/${user}/interests`,
      { headers, params: { type, status, count: 50, start, apiKey: API_KEY }, retry: 2, retryDelay: 3000 },
    )
    results.push(...(data.interests ?? []))
    if (!data.interests?.length || results.length >= data.total) break
  }
  return results
}

function toItem(raw: FrodoInterest, kind: 'book' | 'movie' | 'music'): LifeItem {
  const s = raw.subject
  let cover = s.pic?.normal || s.pic?.large
  // 豆瓣图床 webp 体积小得多；.webp 后缀始终可用
  if (cover && !cover.endsWith('.webp')) cover = cover.replace(/\.\w+$/, '.webp')
  const author =
    kind === 'movie'
      ? s.directors?.map(d => d.name).filter(Boolean).slice(0, 2).join(' / ')
      : s.author?.slice(0, 2).join(' / ') || s.card_subtitle?.split('/')[1]?.trim()
  return {
    id: `douban:${kind}:${s.id}`,
    source: 'douban',
    kind,
    title: s.title,
    date: new Date(raw.create_time.replace(' ', 'T') + '+08:00').toISOString(),
    status: raw.status,
    cover,
    url: s.url,
    rating: raw.rating?.value,
    comment: raw.comment || undefined,
    author: author || undefined,
  }
}

export async function syncDouban(user: string): Promise<LifeItem[]> {
  const items: LifeItem[] = []
  for (const type of ['movie', 'book', 'music'] as const) {
    for (const status of ['done', 'doing', 'mark'] as const) {
      try {
        const raws = await fetchInterests(user, type, status)
        items.push(...raws.map(r => toItem(r, type)))
      } catch (e: any) {
        console.error(`[life] douban ${type}/${status} failed:`, e?.message)
      }
    }
  }
  return items
}
