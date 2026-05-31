## 目标

为后期迁移到自建 Docker (Postgres + pgvector + MinIO) 做准备，在代码里加一层数据访问抽象层，让业务代码不依赖具体后端实现。当前继续使用 Lovable Cloud (Supabase) 跑通流程，迁移时只换 adapter，不改业务。

## 架构

```text
   Routes / Components / Server Functions
                  │
                  ▼
        src/lib/storage/*.ts        ← 业务调用的接口 (DocumentRepo, VectorRepo, BlobStore, AuthProvider)
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
  adapters/supabase    adapters/selfhost
  (现在使用)          (Docker 部署后启用)
                       - pg + pgvector (postgres.js / drizzle)
                       - MinIO (S3 SDK)
                       - 自写 JWT auth
```

通过环境变量 `STORAGE_DRIVER=supabase|selfhost` 在服务端切换，仅在 `createServerFn` 内读取，前端无感知。

## 实施步骤

### 1. 定义接口 (`src/lib/storage/types.ts`)
- `DocumentRepo`: `list / get / upsert / delete` (posts, tweets, media 统一抽象成 document + kind)
- `VectorRepo`: `upsertChunks / hybridSearch(query, k)` — 同时支持 BM25 + cosine
- `BlobStore`: `getSignedUploadUrl / getPublicUrl / delete`
- `CommentRepo` / `AnnotationRepo`: 文章评论与划线讨论
- `AuthProvider`: `getCurrentUser / signIn / signOut`

### 2. Supabase Adapter (`src/lib/storage/adapters/supabase/`)
- 实现以上接口，包装现有的 `supabase` / `supabaseAdmin` client
- 混合搜索调用之前迁移里定义的 `hybrid_search` RPC

### 3. Self-host Adapter 占位 (`src/lib/storage/adapters/selfhost/`)
- 先放接口骨架 + TODO，依赖 `postgres` 和 `@aws-sdk/client-s3`(MinIO 兼容)，等真正部署再实现
- 写一个 `docker-compose.yml` (Postgres+pgvector, MinIO, 应用) 放到 `docs/self-host/`
- 写 schema 迁移文件 (从当前 Supabase migrations 提炼出纯 SQL 版本)

### 4. 工厂入口 (`src/lib/storage/index.ts`)
```ts
export const storage = createStorage(process.env.STORAGE_DRIVER ?? 'supabase')
```
仅在 server functions 内导入，避免泄漏到客户端。

### 5. 改造现有 server functions
- 把已有/即将写的 server function (`postsList`, `chatRAG`, `commentsCreate` …) 全部改成调 `storage.*`，不直接 import `@/integrations/supabase/client`
- Auth 与 realtime 这两个 Supabase 特有能力暂时仍直连，但封装在 `AuthProvider` / `RealtimeProvider` 接口后面，迁移时再换成 `socket.io` 或 polling

### 6. 文档 (`docs/self-host/README.md`)
- docker-compose 启动步骤
- 环境变量映射表 (Supabase ↔ Self-host)
- 数据迁移脚本骨架: `pg_dump` 导出 + 用 `aws s3 sync` 把 Supabase Storage 拉到 MinIO

## 不在本次范围

- 真正部署 Docker (等你有服务器后再做)
- GitHub Actions 摄取管道 (按原 roadmap Phase 2 继续)
- 切换 auth provider (现阶段仍用 Supabase Auth)

## 交付物

- `src/lib/storage/` 完整接口 + Supabase adapter (可用)
- self-host adapter 骨架 + docker-compose + 纯 SQL schema
- 现有 `.lovable/plan.md` 更新 Phase 0/1 后接入 storage 层
- 一份"如何迁移到自建"的步骤文档

确认后我就按这个开始动手。