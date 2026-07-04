---
title: 把 TanStack Start 跑上 Cloudflare Worker 的现场笔记
description: 从 Next.js 迁移过来的活下来了什么、坏掉了什么，以及在边缘运行时写 server function 时我的三条规矩。
date: 2026-03-22
tags: [tanstack, edge, performance]
lang: zh
minutes: 9
---

（这篇写于 Phase 1 时期，保留作历史记录——后来的故事见[《从 TanStack Start 壳到 Nuxt 4》](/posts/from-tanstack-to-nuxt)。）

把一个 Next.js 应用迁到 TanStack Start + Cloudflare Worker，最大的感受是：**边缘运行时是一面照妖镜**，所有对 Node 的隐式依赖都会现形。

## 活下来的

- 纯函数的业务逻辑，一行没改
- fetch 风格的数据获取（本来就是 Web 标准）
- Tailwind 样式层，与运行时无关

## 坏掉的

按修复成本排序：

1. `fs.readFile` 读模板 —— Worker 没有文件系统，改为构建期内联；
2. `crypto.createHash` —— 换 Web Crypto 的 `crypto.subtle.digest`，异步化传染了三层调用；
3. 一个依赖 `process.nextTick` 的第三方限流库 —— 直接删了，用 Durable Object 的原子性重写。

```ts
// Before: Node 专属
import { createHash } from 'node:crypto'
const etag = createHash('sha1').update(body).digest('hex')

// After: 边缘可用
const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(body))
const etag = [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('')
```

## 三条规矩

在边缘写 server function，我给自己立的规矩：

1. **50ms 预算**：单个 function 超过 50ms CPU 时间就要拆，冷启动不是借口而是约束；
2. **无状态偏执**：任何"进程内缓存"都是幻觉，Worker 随时蒸发，状态进 KV 或 DO；
3. **显式区域**：数据库在哪个区，写操作就 pin 在哪个区，别让用户帮你付跨洋 RTT。

> 边缘不是更快的服务器，是一种不同的物理。你不能把大陆性气候的作物直接种到海边。

## 性能收账

迁移后的真实数字（P75，亚洲访客）：

| 指标 | Next.js @ 新加坡 VPS | TanStack @ CF Worker |
| --- | --- | --- |
| TTFB | 380ms | 45ms |
| LCP | 1.9s | 0.8s |
| 冷启动 | N/A（常驻） | 12ms |

TTFB 的提升几乎全部来自「就近执行」。但注意反直觉的一点：**重计算路由反而变慢了**——Worker 的单核性能不如 VPS，我把 RSS 生成挪回了构建期。

边缘适合「薄而广」的逻辑。厚逻辑要么下沉到构建期，要么留在原点服务器。想清楚这一点，迁移就成功了一半。
