# 内容仓库使用指南

你的站点把内容仓库（GitHub repo）当作 CMS。Markdown 文件 = 长文与媒体卡片，GitHub Issues = 推文 / 想法流。每次 push 或 issue 变动，仓库里的 GitHub Action 会通知站点重新摄取、切片、向量化并写入数据库。

## 1. 仓库结构

```text
your-garden-content/
├── posts/
│   ├── 2026-05-30-hello.md
│   └── ...
├── media/
│   ├── 2026-05-28-sunset.md
│   └── ...
└── .github/
    └── workflows/
        └── ingest.yml
```

- `posts/*.md` —— 长文。文件名建议 `YYYY-MM-DD-slug.md`。
- `media/*.md` —— 媒体卡片（图片 / 音频 / 视频），frontmatter 里写 `type` 与 `url`。
- Issues —— 推文 / 碎念，body 即正文，title 可空。可选加 label `tweet`。

## 2. Frontmatter 规范

### 长文（posts/*.md）

```yaml
---
title: 文章标题
title_en: English Title            # 可选
slug: hello-world                  # 可选，默认从文件名取
summary: 一句话摘要                # 可选，留空则 AI 自动生成
summary_en: One-line summary       # 可选
tags: [rag, geek]                  # 可选，留空则 AI 自动打 3~5 个
published_at: 2026-05-30
author: you
---
正文 markdown…
```

### 媒体（media/*.md）

```yaml
---
title: 周五夜里
type: image                        # image | audio | video
url: https://example.com/img.jpg
duration: "03:14"                  # 仅 audio/video 需要
published_at: 2026-05-28
---
可选的图说 / 描述。
```

### 推文（GitHub Issues）

直接在仓库 **Issues** 里新建即可：
- `title` —— 可空。
- `body` —— 正文，支持 markdown。
- `labels` —— 可选 `tweet` 或任意自定义标签，会作为 tag 进库。

## 3. 一次性配置

### 3.1 在内容仓库设置 Secrets / Variables

`Settings → Secrets and variables → Actions`：

- **Variable** `INGEST_URL` =
  `https://project--d2f3907b-aeaa-43f6-83bb-b6e340347249.lovable.app/api/public/ingest`
- **Secret** `INGEST_WEBHOOK_SECRET` = 跟站点端同名 secret 一致的随机串（32+ 字符）。

### 3.2 在 Lovable 项目（站点端）配置 Secrets

- `INGEST_WEBHOOK_SECRET` —— 同上。
- `GITHUB_TOKEN_INGEST` —— fine-grained PAT，对该内容仓库授予 read-only（含 Contents + Issues read）。
- `GITHUB_CONTENT_REPO` —— `owner/repo`，例如 `zhangsan/garden-content`。

### 3.3 复制 Action 模板

把 [`ingest.yml`](./ingest.yml) 放到内容仓库 `.github/workflows/ingest.yml`，commit + push 一次即可生效。

## 4. 数据流

```text
push posts/**.md 或 媒体变更
      │
      ▼  GitHub Actions
POST https://<site>/api/public/ingest
     x-ingest-signature: sha256=HMAC(secret, body)
      │
      ▼  TanStack server route
    校验 HMAC → 拉变更 → 解析 frontmatter
      → AI 自动摘要 + 自动 tag
      → 切片 + embedding (1536 维)
      → upsert documents / chunks / tags
```

## 5. 手动触发

在 Actions 页点击 **Run workflow** 即可触发 `workflow_dispatch`，做一次全量 resync（删除站点端孤儿文档、重拉全部内容）。

## 6. 常见问题

- **签名校验失败 (401)** —— 两端 `INGEST_WEBHOOK_SECRET` 不一致。
- **403 from GitHub** —— PAT 没有该仓库的 read 权限，或仓库改名了。
- **同一 slug 重复** —— `documents` 表 `(kind, source_id)` 唯一，second push 会 upsert 覆盖；改 frontmatter `slug` 会被视为新文档。
- **删除文章** —— 全量 resync 会移除站点端孤儿；增量 push 不会，因为我们只看 added/modified。