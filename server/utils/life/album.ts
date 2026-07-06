// 相册后台（couple-album，本机 8100）客户端：服务端凭证登录，token 进程内缓存
interface AlbumTokens { access_token: string; refresh_token: string }
interface AssetOut { id: string; role: string; mime_type: string; width?: number; height?: number }
interface MomentOut {
  id: string
  type: string
  caption?: string
  taken_at: string
  latitude?: number
  longitude?: number
  location_name?: string
  assets: AssetOut[]
}

export interface AlbumPhoto {
  id: string
  caption?: string
  takenAt: string
  location?: string
  city?: string
  thumb: string
  preview: string
  width?: number
  height?: number
}

export interface TravelCity {
  name: string
  province: string
  x: number // 经度，前端投影
  y: number // 纬度
  count: number
  last: string
}

function baseUrl() {
  return (process.env.ALBUM_API_URL || '').replace(/\/$/, '')
}

export function albumConfigured() {
  return !!(process.env.ALBUM_API_URL && process.env.ALBUM_EMAIL && process.env.ALBUM_PASSWORD)
}

let cached: { token: string; exp: number } | null = null

async function login(): Promise<string> {
  const r = await $fetch<{ tokens: AlbumTokens }>(`${baseUrl()}/auth/login`, {
    method: 'POST',
    body: { email: process.env.ALBUM_EMAIL, password: process.env.ALBUM_PASSWORD },
  })
  const token = r.tokens.access_token
  // JWT exp（秒）；解析失败就 20 分钟后重新登录
  let exp = Date.now() + 20 * 60_000
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1]!, 'base64url').toString())
    if (payload.exp) exp = payload.exp * 1000 - 60_000
  } catch {}
  cached = { token, exp }
  return token
}

export async function albumToken(): Promise<string> {
  if (cached && cached.exp > Date.now()) return cached.token
  return login()
}

async function albumGet<T>(path: string): Promise<T> {
  const token = await albumToken()
  try {
    return await $fetch<T>(`${baseUrl()}${path}`, { headers: { authorization: `Bearer ${token}` } })
  } catch (e: any) {
    if (e?.statusCode === 401) {
      // token 失效（服务重启等）：强制重登一次
      cached = null
      const fresh = await login()
      return await $fetch<T>(`${baseUrl()}${path}`, { headers: { authorization: `Bearer ${fresh}` } })
    }
    throw e
  }
}

export async function fetchAlbumMoments(maxPages = 10): Promise<MomentOut[]> {
  const moments: MomentOut[] = []
  let cursor: string | null = null
  for (let i = 0; i < maxPages; i++) {
    const qs: string = `granularity=month&limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`
    const page = await albumGet<{ buckets: { moments: MomentOut[] }[]; next_cursor: string | null }>(
      `/timeline?${qs}`,
    )
    for (const b of page.buckets) moments.push(...b.moments)
    cursor = page.next_cursor
    if (!cursor) break
  }
  return moments
}

// —— 城市归并：主要城市坐标表，最近城市 120km 内命中；否则回退 location_name 前缀 ——
// [名称, 省份, 纬度, 经度]
const CITIES: [string, string, number, number][] = [
  ['北京', '北京', 39.90, 116.41], ['上海', '上海', 31.23, 121.47], ['天津', '天津', 39.09, 117.20],
  ['重庆', '重庆', 29.56, 106.55], ['广州', '广东', 23.13, 113.26], ['深圳', '广东', 22.55, 114.06],
  ['珠海', '广东', 22.27, 113.58], ['汕头', '广东', 23.35, 116.68], ['杭州', '浙江', 30.27, 120.15],
  ['宁波', '浙江', 29.87, 121.54], ['温州', '浙江', 28.00, 120.70], ['绍兴', '浙江', 30.03, 120.58],
  ['南京', '江苏', 32.06, 118.80], ['苏州', '江苏', 31.30, 120.58], ['无锡', '江苏', 31.49, 120.31],
  ['扬州', '江苏', 32.39, 119.41], ['成都', '四川', 30.57, 104.06], ['乐山', '四川', 29.55, 103.77],
  ['九寨沟', '四川', 33.26, 103.92], ['稻城', '四川', 29.04, 100.30], ['武汉', '湖北', 30.59, 114.31],
  ['宜昌', '湖北', 30.69, 111.29], ['长沙', '湖南', 28.23, 112.94], ['张家界', '湖南', 29.12, 110.48],
  ['凤凰', '湖南', 27.95, 109.60], ['西安', '陕西', 34.34, 108.94], ['郑州', '河南', 34.75, 113.63],
  ['洛阳', '河南', 34.62, 112.45], ['开封', '河南', 34.80, 114.31], ['济南', '山东', 36.65, 117.12],
  ['青岛', '山东', 36.07, 120.38], ['烟台', '山东', 37.46, 121.44], ['泰安', '山东', 36.20, 117.09],
  ['沈阳', '辽宁', 41.81, 123.43], ['大连', '辽宁', 38.91, 121.61], ['长春', '吉林', 43.82, 125.32],
  ['延吉', '吉林', 42.91, 129.51], ['哈尔滨', '黑龙江', 45.80, 126.53], ['漠河', '黑龙江', 52.97, 122.54],
  ['石家庄', '河北', 38.04, 114.51], ['秦皇岛', '河北', 39.94, 119.60], ['承德', '河北', 40.95, 117.94],
  ['太原', '山西', 37.87, 112.55], ['大同', '山西', 40.08, 113.30], ['平遥', '山西', 37.19, 112.18],
  ['呼和浩特', '内蒙古', 40.84, 111.75], ['呼伦贝尔', '内蒙古', 49.21, 119.77], ['阿拉善', '内蒙古', 38.85, 105.73],
  ['合肥', '安徽', 31.82, 117.23], ['黄山', '安徽', 29.71, 118.34], ['福州', '福建', 26.07, 119.30],
  ['厦门', '福建', 24.48, 118.09], ['泉州', '福建', 24.87, 118.68], ['武夷山', '福建', 27.76, 118.04],
  ['南昌', '江西', 28.68, 115.86], ['景德镇', '江西', 29.27, 117.18], ['庐山', '江西', 29.56, 115.99],
  ['南宁', '广西', 22.82, 108.37], ['桂林', '广西', 25.28, 110.29], ['北海', '广西', 21.48, 109.12],
  ['海口', '海南', 20.04, 110.32], ['三亚', '海南', 18.25, 109.51], ['贵阳', '贵州', 26.65, 106.63],
  ['黔东南', '贵州', 26.58, 107.98], ['昆明', '云南', 24.88, 102.83], ['大理', '云南', 25.69, 100.16],
  ['丽江', '云南', 26.86, 100.23], ['香格里拉', '云南', 27.83, 99.70], ['西双版纳', '云南', 22.01, 100.80],
  ['拉萨', '西藏', 29.65, 91.14], ['林芝', '西藏', 29.65, 94.36], ['日喀则', '西藏', 29.27, 88.88],
  ['兰州', '甘肃', 36.06, 103.83], ['敦煌', '甘肃', 40.14, 94.66], ['张掖', '甘肃', 38.93, 100.45],
  ['西宁', '青海', 36.62, 101.78], ['格尔木', '青海', 36.40, 94.90], ['银川', '宁夏', 38.49, 106.23],
  ['乌鲁木齐', '新疆', 43.83, 87.62], ['喀什', '新疆', 39.47, 75.99], ['伊犁', '新疆', 43.92, 81.28],
  ['吐鲁番', '新疆', 42.95, 89.19], ['香港', '香港', 22.32, 114.17], ['澳门', '澳门', 22.20, 113.55],
  ['台北', '台湾', 25.03, 121.57], ['高雄', '台湾', 22.62, 120.31], ['花莲', '台湾', 23.98, 121.60],
]

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const rad = Math.PI / 180
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2
  return 12742 * Math.asin(Math.sqrt(a))
}

export function matchCity(lat: number, lon: number, locationName?: string) {
  let best: (typeof CITIES)[number] | null = null
  let bestD = 120 // km
  for (const c of CITIES) {
    const d = haversineKm(lat, lon, c[2], c[3])
    if (d < bestD) { bestD = d; best = c }
  }
  if (best) return { name: best[0], province: best[1], lat: best[2], lon: best[3] }
  const prefix = locationName?.split(/[·,，\s]/)[0]?.trim()
  if (prefix) return { name: prefix, province: '', lat, lon }
  return null
}

export function buildAlbumPayload(moments: MomentOut[]) {
  const photos: AlbumPhoto[] = []
  const cityMap = new Map<string, TravelCity>()
  for (const m of moments) {
    // 城市点亮：一切带坐标的时刻都参与（含纯文字）
    if (m.latitude != null && m.longitude != null) {
      const c = matchCity(m.latitude, m.longitude, m.location_name)
      if (c) {
        const cur = cityMap.get(c.name)
        if (cur) {
          cur.count++
          if (m.taken_at > cur.last) cur.last = m.taken_at
        } else {
          cityMap.set(c.name, { name: c.name, province: c.province, x: c.lon, y: c.lat, count: 1, last: m.taken_at })
        }
      }
    }
    const thumb = m.assets.find(a => a.role === 'thumbnail')
    const preview = m.assets.find(a => a.role === 'preview') ?? thumb
    if (!thumb) continue // 时间轴只收有图的时刻
    const original = m.assets.find(a => a.role === 'original')
    photos.push({
      id: m.id,
      caption: m.caption || undefined,
      takenAt: m.taken_at,
      location: m.location_name || undefined,
      thumb: `/api/life/photo/${thumb.id}`,
      preview: `/api/life/photo/${preview!.id}`,
      width: original?.width ?? thumb.width,
      height: original?.height ?? thumb.height,
    })
  }
  photos.sort((a, b) => b.takenAt.localeCompare(a.takenAt))
  const cities = [...cityMap.values()].sort((a, b) => b.count - a.count)
  return { photos, cities }
}
