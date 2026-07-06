// 一次性脚本：阿里云 DataV 中国省级 GeoJSON → 预投影 SVG path JSON
// 用法: node scripts/build-china-map.mjs <china.json 路径>
// 输出: app/assets/china-map.json  { viewBox, mercator 参数, provinces:[{name,d}], inset }
import { readFileSync, writeFileSync } from 'node:fs'

const src = process.argv[2]
const geo = JSON.parse(readFileSync(src, 'utf8'))

const W = 820
// 主图经纬范围（大陆+海南+台湾），南海诸岛走插框
const LON = [73.4, 135.2]
const LAT = [17.8, 53.8]
const mercY = lat => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const Y0 = mercY(LAT[1])
const Y1 = mercY(LAT[0])
const SCALE = W / (LON[1] - LON[0])
const H = Math.round(((Y0 - Y1) * 180) / Math.PI * SCALE)
const px = lon => (lon - LON[0]) * SCALE
const py = lat => ((mercY(LAT[1]) - mercY(lat)) * 180) / Math.PI * SCALE

// 南海诸岛插框：右下角
const INSET = { x: W - 130, y: H - 170, w: 122, h: 162, lon: [105.5, 122.5], lat: [2.8, 24.5] }
const ipx = lon => INSET.x + ((lon - INSET.lon[0]) / (INSET.lon[1] - INSET.lon[0])) * INSET.w
const ipy = lat => INSET.y + ((INSET.lat[1] - lat) / (INSET.lat[1] - INSET.lat[0])) * INSET.h

function ringToPath(ring, fx, fy, minArea) {
  // 投影 + 0.1px 量化抽稀
  const pts = []
  for (const [lon, lat] of ring) {
    const x = Math.round(fx(lon) * 2) / 2
    const y = Math.round(fy(lat) * 2) / 2
    const last = pts[pts.length - 1]
    if (!last || last[0] !== x || last[1] !== y) pts.push([x, y])
  }
  if (pts.length < 4) return ''
  // 鞋带公式过滤肉眼不可见的小岛
  let area = 0
  for (let i = 0; i < pts.length - 1; i++) area += pts[i][0] * pts[i + 1][1] - pts[i + 1][0] * pts[i][1]
  if (Math.abs(area / 2) < minArea) return ''
  return 'M' + pts.map(p => p.join(' ')).join('L') + 'Z'
}

function featureToPath(f, fx, fy, minArea) {
  const g = f.geometry
  const polys = g.type === 'Polygon' ? [g.coordinates] : g.coordinates
  let d = ''
  for (const poly of polys) for (const ring of poly) d += ringToPath(ring, fx, fy, minArea)
  return d
}

const provinces = []
let insetPath = ''
for (const f of geo.features) {
  const name = f.properties.name || ''
  // 南海诸岛（十段线）feature 的 name 为空
  if (!name || name.includes('南海诸岛')) {
    insetPath += featureToPath(f, ipx, ipy, 0.02)
    continue
  }
  const d = featureToPath(f, px, py, 1.2)
  if (d) provinces.push({ name: name.replace(/(省|市|自治区|特别行政区|壮族|回族|维吾尔)/g, ''), d })
}

const out = {
  viewBox: `0 0 ${W} ${H}`,
  // 城市定位用的投影参数（组件内按同公式计算）
  proj: { lon0: LON[0], lat1: LAT[1], scale: SCALE },
  inset: { ...INSET, d: insetPath },
  provinces,
}
writeFileSync('app/assets/china-map.json', JSON.stringify(out))
const kb = Math.round(JSON.stringify(out).length / 1024)
console.log(`provinces=${provinces.length} size=${kb}KB viewBox=0 0 ${W} ${H}`)
