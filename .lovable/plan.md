## 阶段二总览

构建从 GitHub 仓库 → 应用数据库的内容管道：当你在内容仓库 push markdown 或编辑 issue 时，GitHub Actions 自动调用站点 webhook，把内容解析、切片、用 AI 总结/打标签/生成 1536 维向量，写入 Supabase；站点页面切换为读真实数据，并支持 BM25 + 向量的混合搜索。

## A. 内容仓库创建指南（你手动操作一次）

在 GitHub 新建一个**私有/公开都行**的内容仓库，目录结构：

```text
your-garden-content/
├── posts/
│   ├── 2026-05-30-hello.md     # 长文，YAML frontmatter + 正文
│   └── ...
├── media/
│   ├── 2026-05-28-sunset.md    # 媒体卡片，frontmatter 含 type/url
│   └── ...
└── .github/
    └── workflows/
        └── ingest.yml          # 我会生成模板，你复制进去
```

Markdown frontmatter 规范（我会在代码里解析）：

```yaml
---
title: 文章标题
title_en: English Title          # 可选，i18n
slug: hello-world                # 可选，默认从文件名取
summary: 一句话摘要              # 可选，留空则 AI 自动生成
tags: [rag, geek]                # 可选，留空则 AI 自动打
published_at: 2026-05-30
author: you
---
正文 markdown…
```

**Tweets** 不走文件，直接在该仓库**开 Issue**（任何 label 都行，可选加 `tweet`）。Issue body 即正文，title 可空。

## B. 数据流

```text
push / issue 事件
   │
GitHub Actions (ingest.yml)
   │  POST /api/public/ingest
   │  Headers: x-ingest-signature = HMAC-SHA256(secret, body)
   ▼
TanStack server route
   ├─ 校验 HMAC
   ├─ 调 GitHub API 拉变更文件 / issue
   ├─ 解析 frontmatter + markdown
   ├─ AI 总结 + 自动 tag (google/gemini-2.5-flash)
   ├─ chunk 切片 (~800 tokens, overlap 100)
   ├─ 向量化 (google/text-embedding-004, 1536 维) ← 走 Lovable AI Gateway
   └─ upsert documents / chunks / tags / document_tags
```

## C. 数据库迁移

新增 SQL：
- `hybrid_search(query_text text, query_embedding vector(1536), match_count int)` 函数：BM25 (`ts_rank_cd`) + 向量余弦相似度归一化加权返回 chunk
- `documents.content_hash` 已有，用作幂等键
- 给 server 角色补充 `INSERT/UPDATE/DELETE` 权限（目前 documents/chunks/tags 只对 anon SELECT）

## D. 后端代码

```text
src/
├── routes/api/public/
│   └── ingest.ts                  # webhook 入口，HMAC 校验 + 入队
├── lib/ingest/
│   ├── github.ts                  # 拉文件/issue 列表
│   ├── parse.ts                   # frontmatter + slug + content_hash
│   ├── chunk.ts                   # 切片
│   ├── embed.ts                   # Lovable AI Gateway embeddings
│   ├── enrich.ts                  # AI 总结 + 打标签
│   └── store.ts                   # upsert 到 Supabase (service role)
├── lib/search/
│   └── hybrid.functions.ts        # createServerFn: 调用 hybrid_search RPC
└── routes/
    └── search.tsx                 # 极简 geek 风搜索页（结果链接到 /posts/$slug）
```

## E. GitHub Actions 模板

`ingest.yml` 监听 `push` (paths: posts/**, media/**) 和 `issues` 事件，仅传事件元信息（不传 GITHUB_TOKEN）：

```yaml
name: Ingest to Garden
on:
  push: { branches: [main], paths: ['posts/**','media/**'] }
  issues: { types: [opened, edited, deleted, labeled] }
  workflow_dispatch:
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Compute payload
        run: |
          PAYLOAD=$(jq -nc \
            --arg event "${{ github.event_name }}" \
            --arg repo  "${{ github.repository }}" \
            --arg ref   "${{ github.sha }}" \
            '{event:$event, repo:$repo, ref:$ref, full_resync: ($event=="workflow_dispatch")}')
          SIG=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "${{ secrets.INGEST_WEBHOOK_SECRET }}" -hex | sed 's/^.* //')
          curl -fsS -X POST "${{ vars.INGEST_URL }}" \
            -H "content-type: application/json" \
            -H "x-ingest-signature: sha256=$SIG" \
            --data "$PAYLOAD"
```

你在内容仓库的 Settings 里配两个东西：
- Variables: `INGEST_URL = https://project--d2f3907b-aeaa-43f6-83bb-b6e340347249.lovable.app/api/public/ingest`
- Secrets: `INGEST_WEBHOOK_SECRET = <我会让你填，跟我给 Lovable 的同名 secret 一致>`

## F. 需要的密钥（一次性）

- `INGEST_WEBHOOK_SECRET` — 任意 32+ 字符随机串，两端同步
- `GITHUB_TOKEN_INGEST` — fine-grained PAT，对内容仓库 read-only（含 Issues read）
- `GITHUB_CONTENT_REPO` — `owner/repo`
- Lovable AI Gateway 已就绪（`LOVABLE_API_KEY` 已配），无需额外申请

## G. 前端接入

- 把 `/posts`、`/posts/$slug`、`/tweets`、`/media` 的 loader 从 mock-data 切到 `getStorage().documents.list(...)`（已有抽象层）
- `/posts/$slug` 用真正的 markdown 渲染（加 `react-markdown` + `remark-gfm`），保留划线/评论组件
- Cmd+K 命令面板增加「Search …」入口跳 `/search?q=...`
- 中英文 i18n 直接从 frontmatter `title_en/summary_en` 取，缺失则回落 `title/summary`

## H. 不在本次范围

- AI Digital Twin RAG 聊天（阶段三）
- 增量补偿任务 / 失败重试 / 死信
- 媒体文件大小/缩略图处理（先只存 url 字符串）

## 实施顺序（一次连贯完成）

1. 写"内容仓库创建指南" `docs/content-repo/README.md` + 示例 `posts/2026-05-30-hello.md` + `ingest.yml`
2. 数据库迁移：`hybrid_search` SQL 函数 + 补 server role 写权限
3. `bun add gray-matter react-markdown remark-gfm @octokit/rest`
4. 实现 `src/lib/ingest/*` + `src/routes/api/public/ingest.ts`
5. 接 `add_secret` 拿 `INGEST_WEBHOOK_SECRET / GITHUB_TOKEN_INGEST / GITHUB_CONTENT_REPO`
6. 实现 `hybrid.functions.ts` + `routes/search.tsx`
7. 切换前端页面 loader 到真实数据（保留 mock 作为空仓库 fallback）
8. 用 `invoke-server-function` 触发一次 `workflow_dispatch` 等价的 full_resync，验证写入

确认这个方案我就开始动手。
