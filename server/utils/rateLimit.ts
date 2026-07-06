// 孪生对话限流：免费档推理配额全站共享（5 RPM），防止单个访客打空。
// 内存桶足够：单进程部署，重启清零无伤大雅。

interface Bucket { last: number; count: number; day: string }
const buckets = new Map<string, Bucket>()

const COOLDOWN_MS = Number(process.env.TWIN_RATE_COOLDOWN_MS ?? 10_000)
const DAILY_MAX = Number(process.env.TWIN_RATE_DAILY_MAX ?? 40)

export function checkTwinRate(ip: string): 'ok' | 'cooldown' | 'daily' {
  const now = Date.now()
  const day = new Date(now).toISOString().slice(0, 10)
  if (buckets.size > 5000) buckets.clear()

  const b = buckets.get(ip)
  if (!b || b.day !== day) {
    buckets.set(ip, { last: now, count: 1, day })
    return 'ok'
  }
  if (b.count >= DAILY_MAX) return 'daily'
  if (now - b.last < COOLDOWN_MS) return 'cooldown'
  b.last = now
  b.count++
  return 'ok'
}

/** 经 Cloudflare 隧道时 cf-connecting-ip 可信（服务只监听 127.0.0.1，无法绕过边缘直连） */
export function clientIP(event: Parameters<typeof getHeader>[0]): string {
  return getHeader(event, 'cf-connecting-ip')
    || getRequestIP(event, { xForwardedFor: true })
    || 'unknown'
}
