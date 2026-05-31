# 极客风个人数字花园 — PRD 与架构设计

> ⚠️ **栈对齐说明**：你 PRD 中写的是 Next.js (App Router)，但当前 Lovable 项目模板是 **TanStack Start v1 + Vite + React 19**（不是 Next.js）。两者在路由/SSR/Server Function 上概念相近，但 API 完全不同。
> 本文档默认按 **TanStack Start** 实现（这是 Lovable 唯一支持的栈），同时在每个关键节点注明"对应 Next.js 中的等价物"，方便你日后迁移或对照原 PRD 阅读。
> 后端默认使用 **Lovable Cloud**（底层是 Supabase，含 Postgres + pgvector + Auth + Storage），AI 调用走 **Lovable AI Gateway**（OpenAI 兼容，支持 Gemini / GPT / Embeddings）。

---

## 1. PRD 概述

### 1.1 产品定位
一个"数字分身 + 数据主权堡垒"型个人站点：
- 内容主权：所有长文/动态/媒体的**真源 (source of truth) 在 GitHub**；Supabase 只做缓存 + 向量索引。
- 智能体感：访客通过 `⌘K` 命令面板进行混合检索；通过悬浮 Chat 与"数字分身"对话（RAG）。
- 极客美学：高对比深色、等宽字体、Spotlight、克制动效。

### 1.2 核心业务闭环

```text
              ┌─────────────────────────────────────────────────┐
              │                 GitHub (Source of Truth)        │
              │   /posts/*.mdx   Issues(label:tweet)   /media   │
              └───────────────┬──────────────────────┬──────────┘
                              │ webhook / push       │ on demand
                              ▼                      │
                  ┌──────────────────────┐           │
                  │  GitHub Actions      │           │
                  │  1. diff 内容        │           │
                  │  2. LLM 抽取 tag/摘要│           │
                  │  3. 调 Embedding     │           │
                  │  4. upsert Supabase  │           │
                  └─────────┬────────────┘           │
                            │                        │
                            ▼                        ▼
        ┌────────────────────────────────────────────────────────┐
        │              Supabase (Lovable Cloud)                  │
        │  documents | chunks(pgvector) | tweets_cache | tags    │
        └─────────┬──────────────────────────┬───────────────────┘
                  │ hybrid search            │ RAG context
                  ▼                          ▼
        ┌──────────────────┐       ┌────────────────────────────┐
        │ TanStack Start   │◀──────│  Server Fn + AI Gateway    │
        │  Routes / SSR    │       │  (streamText, embeddings)  │
        └─────────┬────────┘       └────────────────────────────┘
                  │
                  ▼
        ┌──────────────────────────────────────────┐
        │  Visitor UI: Posts / Tweets / ⌘K / Chat │
        └──────────────────────────────────────────┘
```

闭环关键点：**写在 GitHub → CI 增量同步 → Supabase 做索引 → 前端 SSR 读 Supabase（不是每次现拉 GitHub）→ AI Chat / ⌘K 走同一份向量库**。

---

## 2. 页面路由规划（TanStack Start 文件路由）

> Next.js 对照：`app/posts/[slug]/page.tsx` ≈ TanStack `src/routes/posts.$slug.tsx`；`route.ts` ≈ `src/routes/api/*.ts` 中的 `server.handlers`。

```text
src/routes/
  __root.tsx                  全站 shell（HeadContent、主题、字体、Spotlight、CmdK、FloatingChat）
  index.tsx                   首页：Hero + 最新 posts + 最新 tweets + 一段"问数字分身"入口
  posts.tsx                   /posts  列表（按 tag/年份过滤）
  posts.$slug.tsx             /posts/:slug  MDX 详情（含目录、代码高亮、KaTeX）
  tweets.tsx                  /tweets 时间线（Issues label=tweet）
  tweets.$id.tsx              /tweets/:id  单条动态详情 + GitHub 评论
  media.tsx                   /media  图片打卡 + 音频卡片
  about.tsx                   /about
  search.tsx                  /search?q=…  混合检索结果页（⌘K 也复用此 API）
  _authenticated.tsx          受保护布局（需要 GitHub 登录才能评论/点赞）
  api/
    chat.ts                   POST  RAG 流式对话（也可改为 createServerFn）
    search.ts                 GET   hybrid search (向量 + ts_rank)
    public/
      github-webhook.ts       POST  GitHub push/issue webhook（签名校验后触发同步）
      revalidate.ts           POST  CI 完成后回调，刷新缓存
```

补充：
- `__root.tsx` 注入 `<CommandPalette/>`、`<SpotlightCursor/>`、`<FloatingChat/>`，全局唤起。
- `posts/`、`tweets/` 列表用 **loader + ensureQueryData**，详情页用 **useSuspenseQuery**。
- 所有 `/api/public/*` 用于外部回调（GitHub webhook），必须做 HMAC 签名校验。

---

## 3. 数据结构定义

### 3.1 Supabase 表（public schema，全部需 GRANT + RLS）

```sql
-- 1) 顶层文档：一篇 post 或一条 tweet 或一张 media
create type doc_kind as enum ('post', 'tweet', 'media');

create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  kind          doc_kind not null,
  source_id     text not null,         -- post: file path; tweet: issue number; media: sha
  slug          text unique,           -- 仅 post 用
  title         text,
  summary       text,                  -- LLM 自动生成
  body_md       text,                  -- 原始 markdown（tweet 即 issue body）
  html          text,                  -- 预渲染后的 HTML（可空）
  url_github    text not null,         -- 回源链接
  author        text,
  published_at  timestamptz,
  updated_at    timestamptz not null default now(),
  meta          jsonb not null default '{}'::jsonb,   -- frontmatter / labels / cover
  content_hash  text not null,         -- 用于 CI 增量判断
  unique (kind, source_id)
);

-- 2) 切片 + 向量（pgvector）
create extension if not exists vector;

create table public.chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  ord         int  not null,
  content     text not null,
  tokens      int,
  embedding   vector(3072) not null,   -- google/gemini-embedding-001 默认维度
  tsv         tsvector generated always as (to_tsvector('simple', content)) stored
);
create index on public.chunks using hnsw (embedding vector_cosine_ops);
create index on public.chunks using gin (tsv);

-- 3) 标签（多对多）
create table public.tags (
  id    uuid primary key default gen_random_uuid(),
  name  text unique not null,
  kind  text                                  -- 'topic' | 'tech' | 'mood' …
);
create table public.document_tags (
  document_id uuid references public.documents(id) on delete cascade,
  tag_id      uuid references public.tags(id) on delete cascade,
  primary key (document_id, tag_id)
);

-- 4) Tweet 互动缓存（评论真源仍在 GitHub Issues）
create table public.tweet_reactions (
  document_id uuid references public.documents(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade,
  kind        text not null,                 -- 'like' | 'rocket' …
  created_at  timestamptz not null default now(),
  primary key (document_id, user_id, kind)
);

-- 5) Chat 会话（可选，用于"接着上次聊"）
create table public.chat_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id),
  created_at  timestamptz not null default now()
);
create table public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid references public.chat_sessions(id) on delete cascade,
  role        text not null,                 -- 'user' | 'assistant' | 'tool'
  content     text not null,
  citations   jsonb,                         -- [{document_id, chunk_id, url}]
  created_at  timestamptz not null default now()
);
```

> 每个 `create table` 之后必须跟 `GRANT` + `enable row level security` + `policy`（见 user-roles 规范）。
> 读：documents/chunks/tags 对 `anon` 开放 `SELECT`（全站内容是公开的）。
> 写：仅 `service_role`（CI 同步脚本 + webhook 用）。`tweet_reactions` 仅本人增删自己的行。

### 3.2 GitHub → Supabase 映射

| GitHub 实体 | doc_kind | source_id | meta 内容 |
|---|---|---|---|
| `posts/foo.mdx` (frontmatter) | `post` | 文件路径 | `{frontmatter, cover, reading_time}` |
| Issue `label: tweet` | `tweet` | `#issue_number` | `{reactions, comments_count, labels}` |
| `media/*.jpg/*.mp3` | `media` | git blob sha | `{exif, duration, alt}` |

切片策略：post 按 H2/H3 + 1200 字滑窗（重叠 200）；tweet 整条一片；media 用 caption + alt 文本。

---

## 4. 关键组件接口定义

```ts
// src/lib/github.server.ts
export interface GhPost {
  slug: string;
  path: string;
  title: string;
  frontmatter: Record<string, unknown>;
  body: string;
  sha: string;
  url: string;
}
export function listPosts(): Promise<GhPost[]>;
export function getPost(slug: string): Promise<GhPost | null>;
export function listTweets(opts?: { since?: string }): Promise<GhTweet[]>;

// src/lib/search.functions.ts  （createServerFn）
export const hybridSearch: ServerFn<{
  data: { q: string; k?: number; kind?: DocKind[] };
  result: Array<{
    document_id: string;
    chunk_id: string;
    title: string;
    snippet: string;
    score: number;     // 0.6 * cosine + 0.4 * ts_rank（可调）
    url: string;
  }>;
}>;

// src/routes/api/chat.ts  （POST，SSE 流）
// body: { messages: UIMessage[], sessionId?: string }
// 内部：hybridSearch(messages.lastUserText) → 拼 system prompt → streamText(google/gemini-3-flash-preview)

// src/components/CommandPalette.tsx
// 全局 ⌘K：tabs = [Search, Navigate, AI Ask, Toggle Theme]

// src/components/FloatingChat.tsx
// useChat({ api: '/api/chat' })，渲染 parts，含来源引用气泡

// src/components/SpotlightCursor.tsx
// rAF + CSS radial-gradient mask，prefers-reduced-motion 时禁用
```

---

## 5. 视觉与交互系统（设计 token 落在 `src/styles.css`）

- 主题：默认 dark；`--background: oklch(0.16 0.01 270)`、`--foreground: oklch(0.97 0 0)`、`--primary: oklch(0.78 0.18 145)`（极客绿）。
- 字体：`JetBrains Mono`（code/英文标题）+ `Inter` + `Noto Sans SC`（中文正文）。
- 动效：`framer-motion` 做路由过渡（淡入 + 4px 上移，120ms）；列表用 stagger；尊重 `prefers-reduced-motion`。
- ⌘K：`cmdk` 库；快捷键监听放 `__root.tsx`。
- Spotlight：固定在 `<body>`，z-index 低于内容，pointer-events: none。

---

## 6. 分步开发建议（与你的 Roadmap 对齐，按当前 Lovable 栈落地）

### Phase 0 — 一次性环境
1. 启用 **Lovable Cloud**（Supabase）。
2. 添加 secrets：`GITHUB_TOKEN`（repo 只读 PAT）、`GITHUB_WEBHOOK_SECRET`。`LOVABLE_API_KEY` 自动有，Embeddings/Chat 都走它。
3. 迁移：创建上面 §3.1 的所有表 + GRANT + RLS + pgvector + HNSW 索引。

### Phase 1 — 皮囊（纯前端 Mock）
1. 写 `src/styles.css` 的 dark token + 字体 import。
2. 建路由壳：`__root.tsx` 注入 Spotlight + CmdK + FloatingChat（先用本地 mock 数据）。
3. 三个核心展示组件：`<PostCard/>`、`<TweetItem/>`、`<MediaCard/>`，全部接 mock。
4. 加 `framer-motion` 路由过渡。

### Phase 2 — Git as CMS（后端开始联动）
1. `src/lib/github.server.ts`：封装 Octokit，加 ETag 缓存。
2. `posts.$slug.tsx` loader：先查 Supabase `documents`，miss 再回源 GitHub + 写回。
3. MDX 渲染：`next-mdx-remote` 在 Vite 下不稳，改用 `@mdx-js/mdx` + `shiki` 做服务端编译；KaTeX 用 `rehype-katex`。
4. Tweets：从 Issues 拉 `label:tweet`，渲染到 `tweets.tsx`。

### Phase 3 — RAG 管道
1. Server Function `ingestDocument(source)`：拉原文 → 切片 → 调 `https://ai.gateway.lovable.dev/v1/embeddings` (`google/gemini-embedding-001`) → upsert `chunks`。
2. `/api/public/github-webhook`：校验 HMAC → 解析 push/issue 事件 → 入队调用 `ingestDocument`。
3. GitHub Actions：push 后调一次 `/api/public/github-webhook`（或直接配 webhook，更优）；CI 内额外用 LLM 抽 tag / 摘要写入 `documents.summary` 与 `document_tags`。
4. `hybridSearch` server fn：SQL 同时取 `embedding <=> $1` 与 `ts_rank(tsv, plainto_tsquery($2))`，按加权排序。

### Phase 4 — 灵魂
1. `⌘K` 接 `hybridSearch`，按类型分组展示。
2. `/api/chat`：AI SDK `streamText` + `google/gemini-3-flash-preview`，system prompt 注入"你的语气模板 + 命中的 top-k chunks（带 url）"，强制要求模型在答复末尾给引用。
3. GitHub OAuth 登录：Supabase Auth 自带 GitHub Provider，开启即可；登录后可在 `tweets.$id` 下评论（写回 GitHub Issue comment）与点赞（写 `tweet_reactions`）。
4. 可观测：`chat_messages` 落库，便于后续微调"语气"。

---

## 7. 风险与折中

- **MDX on Vite/Workers**：避免依赖 Node 原生模块（puppeteer/sharp 等不可用），代码高亮用 `shiki`（纯 JS）。
- **3072 维向量**：HNSW 索引体积大；如果内容 < 数百篇，可先 `dimensions: 1536` 截断以省成本/磁盘。
- **GitHub API 限流**：必须走 Supabase 缓存层，前端 SSR 绝不直连 GitHub。
- **RLS**：documents 公开读没问题，但 `chat_messages` 必须按 `auth.uid()` 严格隔离。
- **Next.js vs TanStack**：如你日后坚持迁 Next.js，主要工作量在 `createServerFn → route handlers / server actions` 的等价替换，数据层/AI 层可以原样搬。

---

如果以上方向 OK，我下一步会按 **Phase 0 + Phase 1** 落地：建 migration（表 + RLS + GRANT + pgvector + HNSW），写 design tokens 与字体，搭 `__root.tsx` 的 Spotlight / ⌘K / FloatingChat 骨架，并用 mock 数据跑通三个展示组件。你确认后我就开工。
