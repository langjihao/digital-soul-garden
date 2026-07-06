import { albumConfigured, buildAlbumPayload, fetchAlbumMoments } from '../../utils/life/album'

// 相册数据实时取（本机服务，快），60s 进程内缓存兜住并发
let cache: { at: number; data: any } | null = null
const TTL = 60_000

export default defineEventHandler(async () => {
  if (!albumConfigured()) return { enabled: false, photos: [], cities: [] }
  if (cache && Date.now() - cache.at < TTL) return cache.data
  try {
    const moments = await fetchAlbumMoments()
    const { photos, cities } = buildAlbumPayload(moments)
    const data = { enabled: true, photos, cities }
    cache = { at: Date.now(), data }
    return data
  } catch (e: any) {
    console.error('[life] album fetch failed:', e?.message)
    // 后台暂不可用时返回上次成功数据
    if (cache) return cache.data
    return { enabled: false, photos: [], cities: [] }
  }
})
