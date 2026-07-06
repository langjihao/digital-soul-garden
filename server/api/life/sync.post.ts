import { readLifeData, writeLifeData } from '../../utils/life/store'
import { syncDouban } from '../../utils/life/douban'
import { syncWeread } from '../../utils/life/weread'
import { syncKeep } from '../../utils/life/keep'
import type { LifeItem } from '../../utils/life/types'

// 同步入口：cron 每日 curl 一次。凭 LIFE_SYNC_TOKEN 鉴权，防止被外部随意触发打上游接口
export default defineEventHandler(async (event) => {
  const token = process.env.LIFE_SYNC_TOKEN
  const auth = getHeader(event, 'authorization') || ''
  if (!token || auth !== `Bearer ${token}`)
    throw createError({ statusCode: 401, statusMessage: 'unauthorized' })

  const doubanUser = process.env.DOUBAN_NAME
  const wereadCookie = process.env.WEREAD_COOKIE
  const keepMobile = process.env.KEEP_MOBILE
  const keepPassword = process.env.KEEP_PASSWORD

  const sources = { douban: !!doubanUser, weread: !!wereadCookie, keep: !!(keepMobile && keepPassword) }
  if (!sources.douban && !sources.weread && !sources.keep)
    return { ok: false, message: '未配置任何数据源凭证（DOUBAN_NAME / WEREAD_COOKIE / KEEP_MOBILE+KEEP_PASSWORD）' }

  const prev = await readLifeData()
  const prevItems = prev.demo ? [] : prev.items
  const errors: string[] = []
  const items: LifeItem[] = []
  let readingHour = prev.demo ? undefined : prev.stats.readingHour

  if (sources.douban) {
    try {
      items.push(...(await syncDouban(doubanUser!)))
    } catch (e: any) { errors.push(`douban: ${e?.message}`) }
  }
  if (sources.weread) {
    try {
      const r = await syncWeread(wereadCookie!)
      items.push(...r.items)
      if (r.readingHour) readingHour = r.readingHour
    } catch (e: any) { errors.push(`weread: ${e?.message}`) }
  }
  if (sources.keep) {
    try {
      const known = new Set(prevItems.filter(i => i.source === 'keep').map(i => i.id))
      items.push(...(await syncKeep(keepMobile!, keepPassword!, known)))
      // 增量：把上次已同步的 keep 记录并回来
      items.push(...prevItems.filter(i => i.source === 'keep' && !items.some(n => n.id === i.id)))
    } catch (e: any) { errors.push(`keep: ${e?.message}`) }
  }

  // 某个源本次失败时保留其上次的数据，避免整墙塌掉
  for (const src of ['douban', 'weread', 'keep'] as const) {
    const failed = errors.some(e => e.startsWith(src)) || !sources[src]
    if (failed) items.push(...prevItems.filter(i => i.source === src && !items.some(n => n.id === i.id)))
  }

  // 微信读书和豆瓣读书可能同一本书都有记录 —— 按标题去重，微信读书优先（有进度）
  const seen = new Map<string, LifeItem>()
  const deduped: LifeItem[] = []
  for (const item of items.sort(a => (a.source === 'weread' ? -1 : 1))) {
    if (item.kind === 'book') {
      const key = item.title.replace(/\s|（.*?）|\(.*?\)/g, '')
      if (seen.has(key)) continue
      seen.set(key, item)
    }
    deduped.push(item)
  }

  const data = await writeLifeData(deduped, { sources, readingHour })
  return { ok: errors.length === 0, synced: deduped.length, errors, updatedAt: data.updatedAt }
})
