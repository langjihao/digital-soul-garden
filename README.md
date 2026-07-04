# ~/garden — 数字花园

一座被索引、可检索、可对话的数字花园。Nuxt 4 + @nuxt/content v3 + Tailwind CSS v4。

## 特性

- **内容即代码**：文章（`content/posts/*.md`）、碎念（`content/tweets/*.yml`）、媒体（`content/media/*.yml`）全部生长在仓库里，`git push` 即发布
- **⌘K 命令面板**：全站检索（文章/碎念/媒体）+ 页面跳转 + 主题/语言切换
- **数字孪生**：右下角 RAG 对话，SSE 流式输出；配置 `ANTHROPIC_API_KEY` 后接真实推理，未配置时以演示模式运行（检索是真实的）
- **孪生摘要**：文章页 tl;dr 卡片（同样支持演示模式降级）
- **终端美学 2.0**：磷光绿暗色主题 / 纸质印刷亮色主题，打字机、扫光、滚动显现等克制动效
- **完整周边**：RSS、sitemap、归档 tree、标签页、阅读进度、TOC、相关文章、OG 分享图、终端风 404

## 开发

```bash
npm install
npm run dev        # http://127.0.0.1:3001
```

## 生产

```bash
npm run build      # 产出 .output/
PORT=3000 node .output/server/index.mjs
```

环境变量（可选，用于唤醒真实孪生）：

```bash
ANTHROPIC_API_KEY=sk-ant-...   # 不配则为演示模式
TWIN_MODEL=claude-haiku-4-5-20251001  # 默认值，可换 claude-sonnet-5
```

部署形态与旧站一致：Nitro Node 产物 + systemd + nginx/Cloudflare Tunnel，可直接替换 `/var/www/digital-soul-garden`。

## 写作

新文章：在 `content/posts/` 放一个 `.md`，frontmatter：

```yaml
---
title: 标题
description: 摘要
date: 2026-07-04
tags: [tag1, tag2]
lang: zh        # 或 en
minutes: 8      # 预计阅读分钟
draft: false
---
```

新碎念：`content/tweets/0143.yml`（`num` 递增即可）。
