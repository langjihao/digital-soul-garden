# ~/garden — 数字花园

一座被索引、可检索、可对话的数字花园。Nuxt 4 + @nuxt/content v3 + Tailwind CSS v4。

## 特性

- **内容即代码**：文章（`content/posts/*.md`）、碎念（`content/tweets/*.yml`）、媒体（`content/media/*.yml`）全部生长在仓库里，`git push` 即发布
- **⌘K 命令面板**：全站检索（文章/碎念/媒体）+ 页面跳转 + 主题/语言切换
- **数字孪生**：右下角 RAG 对话，SSE 流式输出；文章页支持「本文/全站」双范围问答（本文模式注入全文）
- **混合检索**：词法 2-gram 打分 + `gemini-embedding-001` 余弦相似度等权合并，向量按内容哈希增量嵌入并落盘；无 key / 限流时自动退回纯词法
- **多级推理降级**：Anthropic（可选）→ Gemini 主模型 → Gemini lite → 检索降级，429/5xx/空输出自动降档，永不白屏
- **孪生摘要**：文章页 tl;dr 卡片，结果持久化到磁盘（含内容哈希失效），重启不重耗配额
- **动态 OG 图**：`/og/posts/<slug>.png` 按文章实时渲染终端风分享图（SVG → sharp），内存缓存
- **评论**：giscus（GitHub Discussions），跟随站内主题/语言切换，未配置时自动隐藏
- **记录墙**：`/life` 书影音运动数据（豆瓣/微信读书/Keep 每日同步，未配凭证时演示模式）
- **终端美学 2.0**：磷光绿暗色主题 / 纸质印刷亮色主题，打字机、扫光、滚动显现等克制动效
- **完整周边**：RSS、sitemap、归档 tree、标签页、阅读进度、TOC、相关文章、终端风 404

## 开发

```bash
npm install
npm run dev        # http://127.0.0.1:3001
```

## 部署

```bash
./deploy.sh        # 构建 → 冒烟测试 → 切 release → 重启 → 验证，失败自动回滚
```

产物为 Nitro Node 形态：`releases/<ts>/.output` + `current` 软链 + systemd + Cloudflare Tunnel。

## 环境变量

生产环境写在 `/etc/garden.env`（systemd `EnvironmentFile`）：

| 变量 | 说明 |
| --- | --- |
| `GEMINI_API_KEY` | 孪生推理 + 向量检索（Google AI Studio） |
| `GEMINI_MODEL` | 主模型，默认 `gemini-3.5-flash` |
| `GEMINI_MODEL_LITE` | 限流降档模型，默认 `gemini-2.5-flash-lite` |
| `GEMINI_THINKING_BUDGET` | 思考 token 预算，默认 `0`（必须关闭，否则正文为空） |
| `ANTHROPIC_API_KEY` / `TWIN_MODEL` | 可选，配置后优先于 Gemini |
| `GARDEN_SHARED_DIR` | 跨 release 数据目录（向量/摘要缓存），生产为 `/var/www/digital-soul-garden/shared` |
| `NUXT_PUBLIC_GISCUS_REPO` 等 | giscus 评论四件套（repo / repoId / category / categoryId） |
| `DOUBAN_NAME` / `WEREAD_COOKIE` / `KEEP_MOBILE`+`KEEP_PASSWORD` | 记录墙数据源（可选） |
| `LIFE_SYNC_TOKEN` | `/api/life/sync` 的 Bearer 鉴权 |

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

---

developed & designed by [Claude Code](https://claude.com/claude-code) & [langjihao](https://github.com/langjihao)
