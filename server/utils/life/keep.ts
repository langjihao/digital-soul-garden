import type { LifeItem } from './types'

// Keep：手机号+密码登录换 token，再拉全量运动统计（分页游标 lastDate）
const BASE = 'https://api.gotokeep.com'

const sportNames: Record<string, string> = {
  running: '跑步',
  hiking: '步行',
  walking: '步行',
  cycling: '骑行',
  swimming: '游泳',
  training: '训练',
  yoga: '瑜伽',
}

interface StatsLog {
  type: string
  id: string
  name?: string
  endTime?: number
  isDoubtful?: boolean
  stats?: StatsLog
}

async function login(mobile: string, password: string): Promise<string> {
  const r = await $fetch<{ data?: { token?: string } }>(`${BASE}/v1.1/users/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body: new URLSearchParams({ mobile, password, countryCode: process.env.KEEP_COUNTRY_CODE || '86' }).toString(),
  })
  const token = r.data?.token
  if (!token) throw new Error('keep login failed')
  return token
}

async function fetchAllLogs(token: string): Promise<StatsLog[]> {
  const h = { authorization: `Bearer ${token}` }
  const logs: StatsLog[] = []
  let lastDate: number | string = 0
  // lastDate 游标翻页，直到返回 0/空
  for (let page = 0; page < 100; page++) {
    const r = await $fetch<{ data?: { lastTimestamp?: number; records?: { logs?: { type: string; stats?: StatsLog }[] }[] } }>(
      `${BASE}/pd/v3/stats/detail`,
      { headers: h, params: { dateUnit: 'all', type: 'all', lastDate } },
    )
    for (const rec of r.data?.records ?? [])
      for (const log of rec.logs ?? [])
        if (log.type === 'stats' && log.stats) logs.push(log.stats)
    lastDate = r.data?.lastTimestamp ?? 0
    if (!lastDate) break
  }
  return logs
}

interface LogDetail {
  id: string
  startTime?: number
  endTime?: number
  distance?: number
  duration?: number
  averagePace?: number
  calorie?: number
  heartRate?: { averageHeartRate?: number }
}

export async function syncKeep(mobile: string, password: string, known: Set<string>): Promise<LifeItem[]> {
  const token = await login(mobile, password)
  const h = { authorization: `Bearer ${token}` }
  const logs = (await fetchAllLogs(token)).filter(l => !l.isDoubtful)

  const items: LifeItem[] = []
  for (const log of logs) {
    const id = `keep:${log.id}`
    if (known.has(id)) continue // 明细接口逐条较慢，已同步过的跳过
    try {
      const d = await $fetch<{ data?: LogDetail }>(`${BASE}/pd/v3/${log.type}log/${log.id}`, { headers: h })
      const data = d.data
      if (!data?.endTime) continue
      const durationMin = data.duration ? Math.round(data.duration / 60) : undefined
      const pace = data.averagePace
        ? `${Math.floor(data.averagePace / 60)}'${String(Math.round(data.averagePace % 60)).padStart(2, '0')}"`
        : undefined
      items.push({
        id,
        source: 'keep',
        kind: 'workout',
        title: log.name || sportNames[log.type] || log.type,
        date: new Date(data.endTime).toISOString(),
        status: 'done',
        sport: {
          type: sportNames[log.type] || log.type,
          distanceKm: data.distance ? Math.round(data.distance / 100) / 10 : undefined,
          durationMin,
          calorie: data.calorie,
          pace,
        },
      })
    } catch (e: any) {
      console.error(`[life] keep log ${log.id} failed:`, e?.message)
    }
  }
  return items
}
