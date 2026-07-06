import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

// 跨 release 存活的数据目录：生产由 systemd 注入 GARDEN_SHARED_DIR=/var/www/digital-soul-garden/shared
const sharedDir = () => process.env.GARDEN_SHARED_DIR || '.data/shared'

export async function readShared<T>(name: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(join(sharedDir(), name), 'utf8')) as T
  } catch {
    return fallback
  }
}

export async function writeShared(name: string, data: unknown): Promise<void> {
  try {
    await mkdir(sharedDir(), { recursive: true })
    await writeFile(join(sharedDir(), name), JSON.stringify(data), 'utf8')
  } catch { /* 磁盘写失败不阻断请求，下次进程重启自然重建 */ }
}
