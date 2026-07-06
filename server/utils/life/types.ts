// 书影音运动记录的归一化模型：三个上游（豆瓣/微信读书/Keep）都收敛到 LifeItem
export type LifeKind = 'book' | 'movie' | 'music' | 'workout'
export type LifeStatus = 'done' | 'doing' | 'mark'

export interface LifeItem {
  id: string                 // `${source}:${原始id}`，跨次同步幂等去重
  source: 'douban' | 'weread' | 'keep'
  kind: LifeKind
  title: string
  date: string               // ISO 8601，标记/完成/运动结束时间
  status: LifeStatus
  cover?: string
  url?: string
  rating?: number            // 1-5
  comment?: string
  author?: string            // 书=作者，影=导演，音=歌手
  // 运动专属
  sport?: { type: string; distanceKm?: number; durationMin?: number; calorie?: number; pace?: string }
  // 阅读专属（微信读书）
  reading?: { progress?: number; readingMin?: number }
}

export interface LifeStats {
  books: { done: number; doing: number }
  movies: { done: number }
  music: { done: number }
  workouts: { count: number; distanceKm: number; durationHour: number; calorie: number }
  readingHour?: number
}

export interface LifeData {
  updatedAt: string
  demo: boolean
  sources: { douban: boolean; weread: boolean; keep: boolean }
  stats: LifeStats
  items: LifeItem[]
}

export function computeStats(items: LifeItem[], readingHour?: number): LifeStats {
  const of = (kind: LifeKind, status?: LifeStatus) =>
    items.filter(i => i.kind === kind && (!status || i.status === status))
  const workouts = of('workout')
  return {
    books: { done: of('book', 'done').length, doing: of('book', 'doing').length },
    movies: { done: of('movie', 'done').length },
    music: { done: of('music', 'done').length },
    workouts: {
      count: workouts.length,
      distanceKm: Math.round(workouts.reduce((s, w) => s + (w.sport?.distanceKm ?? 0), 0) * 10) / 10,
      durationHour: Math.round(workouts.reduce((s, w) => s + (w.sport?.durationMin ?? 0), 0) / 6) / 10,
      calorie: Math.round(workouts.reduce((s, w) => s + (w.sport?.calorie ?? 0), 0)),
    },
    readingHour,
  }
}
