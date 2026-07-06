import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { LifeData, LifeItem } from './types'
import { computeStats } from './types'

// 数据文件放 LIFE_DATA_DIR（生产=/var/www/digital-soul-garden/shared，跨 release 存活），dev 落在 .data/
function dataFile() {
  const dir = process.env.LIFE_DATA_DIR || join(process.cwd(), '.data')
  return { dir, file: join(dir, 'life.json') }
}

export async function readLifeData(): Promise<LifeData> {
  try {
    const { file } = dataFile()
    const raw = await readFile(file, 'utf8')
    const data = JSON.parse(raw) as LifeData
    if (data.items?.length) return data
  } catch {}
  return demoData()
}

export async function writeLifeData(items: LifeItem[], opts: { sources: LifeData['sources']; readingHour?: number }) {
  const { dir, file } = dataFile()
  await mkdir(dir, { recursive: true })
  const data: LifeData = {
    updatedAt: new Date().toISOString(),
    demo: false,
    sources: opts.sources,
    stats: computeStats(items, opts.readingHour),
    items: items.sort((a, b) => b.date.localeCompare(a.date)),
  }
  await writeFile(file, JSON.stringify(data), 'utf8')
  return data
}

// —— 演示数据：未配置任何凭证时页面照常可看，配好凭证同步一次即自动替换 ——
function demoData(): LifeData {
  const year = new Date().getFullYear()
  const iso = (m: number, d: number) => new Date(Date.UTC(year - (m < 0 ? 1 : 0), ((m % 12) + 12) % 12, d, 12)).toISOString()
  const items: LifeItem[] = [
    { id: 'demo:b1', source: 'weread', kind: 'book', title: '置身事内', author: '兰小欢', status: 'done', rating: 5, date: iso(5, 12), reading: { progress: 100 } },
    { id: 'demo:b2', source: 'weread', kind: 'book', title: '纳瓦尔宝典', author: '埃里克·乔根森', status: 'doing', date: iso(6, 1), reading: { progress: 62 } },
    { id: 'demo:b3', source: 'douban', kind: 'book', title: '斯通纳', author: '约翰·威廉斯', status: 'done', rating: 5, comment: '安静而汹涌的一生。', date: iso(3, 22) },
    { id: 'demo:b4', source: 'douban', kind: 'book', title: '毫无意义的工作', author: '大卫·格雷伯', status: 'mark', date: iso(6, 3) },
    { id: 'demo:m1', source: 'douban', kind: 'movie', title: '沙丘2', author: '丹尼斯·维伦纽瓦', status: 'done', rating: 4, comment: 'IMAX 值回票价。', date: iso(2, 8) },
    { id: 'demo:m2', source: 'douban', kind: 'movie', title: '奥本海默', author: '克里斯托弗·诺兰', status: 'done', rating: 5, date: iso(-4, 2) },
    { id: 'demo:m3', source: 'douban', kind: 'movie', title: '坠落的审判', author: '茹斯汀·特里耶', status: 'done', rating: 4, date: iso(1, 14) },
    { id: 'demo:m4', source: 'douban', kind: 'movie', title: '猫和老鼠', status: 'doing', date: iso(6, 2) },
    { id: 'demo:a1', source: 'douban', kind: 'music', title: '范特西', author: '周杰伦', status: 'done', rating: 5, date: iso(0, 20) },
    { id: 'demo:a2', source: 'douban', kind: 'music', title: 'OK Computer', author: 'Radiohead', status: 'done', rating: 5, date: iso(-2, 11) },
  ]
  // 一年的演示运动记录：伪随机但确定性（页面热力图有东西可画）
  let seed = 42
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const now = Date.now()
  for (let d = 364; d >= 0; d--) {
    if (rand() < 0.22) {
      const date = new Date(now - d * 86400_000)
      const km = Math.round((2 + rand() * 6) * 10) / 10
      items.push({
        id: `demo:w${d}`,
        source: 'keep',
        kind: 'workout',
        title: rand() < 0.7 ? '跑步' : '步行',
        status: 'done',
        date: date.toISOString(),
        sport: { type: rand() < 0.7 ? '跑步' : '步行', distanceKm: km, durationMin: Math.round(km * (6 + rand() * 2)), calorie: Math.round(km * 62) },
      })
    }
  }
  items.sort((a, b) => b.date.localeCompare(a.date))
  return {
    updatedAt: new Date().toISOString(),
    demo: true,
    sources: { douban: false, weread: false, keep: false },
    stats: computeStats(items, 286.5),
    items,
  }
}
