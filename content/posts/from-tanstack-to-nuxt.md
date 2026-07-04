---
title: 从 TanStack Start 壳到 Nuxt 4：一次务实的重建
description: Phase 1 的静态外壳死于一对不匹配的 Clerk 密钥。重建时我选择了让内容管道先于一切的路线。
date: 2026-05-28
tags: [nuxt, tanstack, rebuild, devx]
lang: zh
minutes: 7
---

上一版花园是 TanStack Start 写的 Phase 1 外壳：界面像模像样，数据全是 mock，认证接了 Clerk。它最终死得很有教育意义——**构建期烧进前端的 publishable key 和运行期读的 secret key 来自两个不同的 Clerk 实例**，首次访问触发 handshake 直接 500，所有真实浏览器访客看到的都是错误兜底页。

尸检报告给我三条教训。

## 教训一：先有内容管道，再有界面

Phase 1 的路线图是「先做壳，再接数据」。错。壳会说谎——它让你以为项目完成了 80%，实际上最难的 20%（内容从哪来、怎么索引、怎么增量更新）一行都没写。

重建时我反过来：第一天先让 `content/` 目录里的 Markdown 变成页面，哪怕样式全无。**能被 `git log` 追踪的内容才是资产，组件不是。**

## 教训二：认证是可选依赖，不是地基

旧版把 Clerk 放在请求中间件里，等于给每个页面都埋了一颗外部依赖的雷。新版的原则：

- 阅读永远不需要登录，认证组件懒加载；
- 任何第三方 SDK 出错，降级为「该功能暂不可用」，而不是整站白屏；
- 构建期与运行期的配置**同源校验**——CI 里加一步 `env-check`，pk/sk 实例不匹配直接拒绝部署。

```ts
// scripts/env-check.mjs —— 部署前的 30 行保险
const pk = decodeInstance(process.env.VITE_CLERK_PUBLISHABLE_KEY)
const sk = await clerkInstanceOf(process.env.CLERK_SECRET_KEY)
if (pk !== sk) {
  console.error(`Clerk 实例不匹配: pk=${pk} sk=${sk}`)
  process.exit(1)
}
```

## 教训三：框架选型跟着内容形态走

TanStack Start 是优秀的应用框架，但这座花园 90% 的页面是**内容**。Nuxt + @nuxt/content 给我的是开箱即用的 Markdown→数据库、Shiki 高亮、TOC 生成与全文查询——这些在应用框架里都得手搓。

迁移对照表：

| 关注点 | TanStack Start | Nuxt 4 |
| --- | --- | --- |
| Markdown 管道 | 手搓 MDX + 插件链 | @nuxt/content 内置 |
| 服务端 | Nitro | Nitro（相同！） |
| 部署产物 | node .output | node .output（不变） |
| AI 流式接口 | server function | Nitro route + SSE |

最后一行是重点：**两者共享 Nitro，部署层完全不用动**。systemd 单元、nginx 反代、Cloudflare Tunnel，一个字符都没改。

## 迁移之后

删掉 mock 数据的那个 commit 是整个重建里最爽的一次提交：

```bash
git rm -r src/mocks
# 47 files changed, 12 insertions(+), 3841 deletions(-)
```

如果你也在维护一个「看起来完成了」的 Phase 1：去检查你的 mock 数据背后有没有真管道。没有的话，你维护的不是网站，是一张海报。
