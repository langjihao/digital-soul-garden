# Geek Digital Garden — 交接文档

> 最后更新：2026-06-01 · 对应代码库当前状态

本文档对照实际代码梳理了项目的当前形态、关键文件、运行所需的配置以及后续待办，便于另一位维护者直接接手。

---

## 1. 项目概览

一个 Geek 风格的个人数字花园：

- **前台展示**：长文 (`/posts`)、Tweets (`/tweets`)、媒体流 (`/media`)、关于 (`/about`)。
- **交互特性**：Cmd+K 命令面板、Spotlight 光标、页面切换动画、划线评论、底部评论区、悬浮 AI 对话。
- **内容来源**：GitHub 仓库作为 CMS（Markdown 文件 + Issues），通过 GitHub Actions webhook 增量同步。
- **检索**：Postgres `tsvector` (BM25) + `pgvector` 余弦相似度，通过 RRF 合并的 `hybrid_search` SQL 函数。
- **AI**：Lovable AI Gateway，本地 RAG（检索 → 注入 prompt → 流式输出 → 引用脚注）。
- **认证**：Clerk（Email OTP / GitHub / Google），未登录可浏览全部内容，互动可匿名留昵称。
- **i18n**：中文为主，英文兜底；frontmatter 提供 `title_en` / `summary_en`。

技术栈：TanStack Start v1 + React 19 + Vite 7 + Tailwind v4 + framer-motion + cmdk + AI SDK + Supabase (Lovable Cloud) + Clerk。

---

## 2. 路由与页面

| 路由 | 文件 | 说明 |
| --- | --- | --- |
| `/` | `src/routes/index.tsx` | 首页 |
| `/posts` | `src/routes/posts.tsx` | 长文列表，loader 走 `listPostsServer` |
| `/posts/$slug` | `src/routes/posts.$slug.tsx` | 详情，含划线评论与评论区；DB 命中则用真实数据，未命中回退 mock |
| `/tweets` | `src/routes/tweets.tsx` | Issues 渲染为 Tweets 流 |
| `/media` | `src/routes/media.tsx` | 媒体卡片 |
| `/about` | `src/routes/about.tsx` | 静态介绍 |
| `/search` | `src/routes/search.tsx` | Geek 命令行风格混合搜索界面 |
| `/sign-in/*`, `/sign-up/*` | `src/routes/sign-in.$.tsx`, `sign-up.$.tsx` | Clerk 登录注册 |
| `POST /api/chat` | `src/routes/api/chat.ts` | RAG 流式对话（AI SDK + Lovable AI Gateway） |
| `POST /api/public/ingest` | `src/routes/api/public/ingest.ts` | GitHub Actions webhook，HMAC 校验 |

`src/routes/__root.tsx` 负责全局 Provider：ClerkProvider、i18n、SpotlightCursor、CommandPalette、FloatingChat、SiteHeader、PageTransition。

---

## 3. 数据库（Supabase / Lovable Cloud）

| 表 | 用途 | 关键字段 |
| --- | --- | --- |
| `documents` | GitHub 同步后的内容 | `kind` (post/tweet/media), `source_id`, `slug`, `title`, `summary`, `body_md`, `meta jsonb` (含 `title_en`/`summary_en`/`media`), `content_hash`, `url_github` |
| `chunks` | 切片 + 向量 + 全文索引 | `embedding vector(1536)`, `tsv tsvector`, `content`, `ord` |
| `tags`, `document_tags` | AI 自动打标 | `name`, `kind` |
| `comments` | 文章评论 | `document_id text`, `clerk_user_id` 可空, `author_name/email`, `parent_id` |
| `annotations` | 段落级划线讨论 | `document_id text`, `paragraph_index`, `quote`, `body`, `clerk_user_id` 可空 |
| `tweet_reactions` | Tweet 表情反应（预留） | `user_id text`, `document_id`, `kind` |
| `chat_sessions`, `chat_messages` | 预留对话持久化（当前未写入） | `user_id text`, `citations jsonb` |

RLS：所有表对 `anon`/`authenticated` 仅放开 `SELECT`，写入一律通过服务端 `supabaseAdmin`（service role）。

SQL 函数：
- `hybrid_search(query_text, query_embedding vector, match_count, full_text_weight, semantic_weight, rrf_k)` — RRF 合并 BM25 与余弦，返回 `chunk_id, document_id, content, score`。
- `set_updated_at()` — 触发器函数。

`vector` 扩展放在 `extensions` schema，函数 `search_path` 已绑定。

---

## 4. 内容管道（Phase 2）

触发链路：

```text
content-repo push / issue
   → .github/workflows/ingest.yml
   → POST /api/public/ingest (HMAC sha256)
   → src/routes/api/public/ingest.ts
   → src/lib/ingest/run.server.ts
       ├─ github.server.ts  拉文件/issue
       ├─ parse.server.ts   frontmatter + content_hash
       ├─ chunk.server.ts   段落切片(overlap)
       ├─ enrich.server.ts  AI 摘要 + 自动 tag (gemini-2.5-flash)
       ├─ embed.server.ts   openai/text-embedding-3-small @ 1536d
       └─ store.server.ts   upsert documents/chunks/tags/document_tags
```

模板与说明：`docs/content-repo/README.md`、`docs/content-repo/ingest.yml`、`docs/content-repo/posts/2026-05-30-hello.md`。

内容仓库 GitHub 端需配置：
- Variables: `INGEST_URL = https://project--d2f3907b-aeaa-43f6-83bb-b6e340347249.lovable.app/api/public/ingest`
- Secrets: `INGEST_WEBHOOK_SECRET`（与站点同名 secret 一致）

幂等性：`content_hash` 不变则跳过；删除事件 / 全量重同步会清理孤儿。

---

## 5. 搜索与 RAG（Phase 2 + 3）

- 入口：`/search` 页面 + Cmd+K 命令面板 + 悬浮 AI 对话。
- 服务端：
  - `src/lib/search/hybrid.functions.ts` — `hybridSearch` server function，调 `hybrid_search` RPC。
  - `src/lib/rag/retrieve.server.ts` — 检索 → 文档元数据补全 → 生成带编号的 `RagSource[]` 与 `contextBlock`。
  - `src/lib/ai-gateway.server.ts` — Lovable AI Gateway 的 OpenAI-compatible 封装，附带 Run-ID。
  - `src/routes/api/chat.ts` — `streamText` (`google/gemini-3-flash-preview`)，引用作为 `messageMetadata.sources` 返回。
- 前端：`src/components/site/FloatingChat.tsx`，`useChat` + `DefaultChatTransport`，`react-markdown` 渲染，引用渲染为可跳转 chip。

Embedding 模型：`openai/text-embedding-3-small` (1536d) — 与 `chunks.embedding vector(1536)` 一致，匹配 HNSW 限制。

---

## 6. 认证（Clerk）

- SDK：`@clerk/tanstack-react-start`，`clerkMiddleware()` 在 `src/start.ts` 注册并显式传 `publishableKey`（解决 SSR "Publishable key is missing"）。
- 完全公开浏览，仅划线 / 评论需要身份；未登录用户可填昵称匿名提交。
- 数据库中 `user_id` / `document_id` 列已迁为 `text` 以承载 Clerk ID。
- 入口：`<a href="/sign-in">`，避免 TanStack Link 与 Clerk 内部路由冲突。

---

## 7. 存储抽象（备用迁移路径）

- 接口：`src/lib/storage/types.ts`
- 当前实现：`adapters/supabase.server.ts`
- 自托管骨架：`adapters/selfhost.server.ts`（Postgres+pgvector + MinIO）
- 切换开关：`STORAGE_DRIVER` 环境变量；工厂在 `src/lib/storage/index.server.ts`。
- 自托管资料：`docs/self-host/README.md`、`docker-compose.yml`、`schema.sql`（含 `hybrid_search` 函数副本）。

> 注：评论/划线/Chat 直接使用 `supabaseAdmin`，未走抽象层；如要彻底迁移需补全 adapter 并替换调用点。

---

## 8. 国际化

- `src/lib/i18n/translations.ts` — 中英文 UI 字串。
- `src/lib/i18n/provider.tsx` — Context + localStorage 持久化，`useT()` 钩子。
- 切换按钮：`src/components/site/LanguageToggle.tsx`。
- 内容侧：frontmatter `title_en` / `summary_en` → `meta jsonb` → `documents.functions.ts` 中 `pick()` 解出。
- 字体：`JetBrains Mono` + `Inter` + `Noto Sans SC`（在 `src/styles.css` 顶部 `@import`）。

---

## 9. 环境变量 / Secrets

已配置（Lovable Cloud Secrets）：
- `LOVABLE_API_KEY` — AI Gateway
- `CLERK_SECRET_KEY` + `VITE_CLERK_PUBLISHABLE_KEY` (`.env`)
- `SUPABASE_*`（自动注入）
- `DIFY_API_KEY` / `DIFY_API_URL` — **已不再使用**，可清理

待用户配置（Phase 2 触发前）：
- `INGEST_WEBHOOK_SECRET`
- `GITHUB_TOKEN_INGEST`（fine-grained PAT，内容仓库 read-only + Issues read）
- `GITHUB_CONTENT_REPO`（`owner/repo`）

---

## 10. 当前状态 vs 原计划（`.lovable/plan.md`）

| 计划项 | 状态 | 备注 |
| --- | --- | --- |
| 内容仓库模板 | ✅ | `docs/content-repo/*` |
| `hybrid_search` SQL + 写权限 | ✅ | service role 经服务端写入 |
| 依赖 `gray-matter / react-markdown / remark-gfm / @octokit/rest` | ✅ | |
| `src/lib/ingest/*` + 公共 ingest 路由 | ✅ | |
| 三个 GitHub 相关 secret | ⏳ 用户配置 | |
| `hybrid.functions.ts` + `/search` | ✅ | |
| 前端 loader 切真实数据 + mock 兜底 | ✅ | `documents.functions.ts` |
| 触发一次 full_resync 验证 | ⏳ 待执行 | secrets 配齐后 `workflow_dispatch` |
| **额外完成**：本地 RAG + 引用 | ✅ | 原计划列为"阶段三" |
| **额外完成**：Clerk 认证迁移 | ✅ | |
| **额外完成**：i18n 中英双语 | ✅ | |
| **额外完成**：存储抽象 + 自托管文档 | ✅ | |

---

## 11. 已知待办 / 后续建议

1. **首次同步**：填好 3 个 GitHub secret，在内容仓库手动跑 `workflow_dispatch`，验证 `documents`/`chunks` 写入与 `/search` 命中。
2. **Chat 会话持久化**：`chat_sessions` / `chat_messages` 已建表但 `api/chat.ts` 还未写入；推荐用 AI SDK `onFinish` 落库（需 RLS 策略 + 服务端写）。
3. **评论 / 划线写入策略**：当前匿名也可写，可加 Cloudflare Turnstile / 简易频控防滥用。
4. **Tweet 反应**：表已就绪，UI 还未实现。
5. **媒体处理**：当前只存 URL；后续可接 R2 / Supabase Storage + 缩略图。
6. **Dify 清理**：`DIFY_*` secret 与历史逻辑已废弃，可移除。
7. **失败重试 / 死信**：ingest 当前是 fire-and-forget，建议加重试队列或定时全量补偿。
8. **SEO / OG**：各 route `head()` 仅有基础 title，可按 `tanstack-route-architecture` 补 og:image。

---

## 12. 关键命令

```bash
# 安装依赖
bun install

# 本地开发（Lovable 内置）
# 修改文件即可，HMR 自动生效

# 触发一次手动全量同步（在内容仓库 Actions 页面 Run workflow）
# 或本地 curl：
PAYLOAD='{"event":"workflow_dispatch","repo":"owner/repo","ref":"HEAD","full_resync":true}'
SIG=$(printf '%s' "$PAYLOAD" | openssl dgst -sha256 -hmac "$INGEST_WEBHOOK_SECRET" -hex | awk '{print $NF}')
curl -X POST "$INGEST_URL" -H "content-type: application/json" \
  -H "x-ingest-signature: sha256=$SIG" --data "$PAYLOAD"
```

---

## 13. 联系点 / 进入项目的建议路径

1. 先读本文件 → `.lovable/plan.md`（阶段二原始计划）→ `docs/content-repo/README.md`。
2. 跑通一次 ingest，再看 `/search` 与悬浮 Chat。
3. 修改 UI：组件集中在 `src/components/site/*`，设计 token 全在 `src/styles.css`。
4. 改后端：所有写操作集中在 `src/lib/ingest/*`、`src/lib/api/*.functions.ts`、`src/routes/api/*`。

祝接手顺利 ✨