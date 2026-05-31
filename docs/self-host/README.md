# Self-Host Deployment

从 Lovable Cloud (Supabase) 迁移到你自己的服务器，依赖三件套：
**Postgres + pgvector** · **MinIO (S3 兼容)** · **Node 应用本身**。

## 1. 启动

```bash
cd docs/self-host
cp .env.example .env       # 自己创建，填上 POSTGRES_PASSWORD / JWT_SECRET / LOVABLE_API_KEY
docker compose up -d
```

服务端口：

| 服务 | 地址 |
|------|------|
| 应用 | http://localhost:3000 |
| Postgres | localhost:5432 (user: garden / db: garden) |
| MinIO S3 API | http://localhost:9000 |
| MinIO Console | http://localhost:9001 |

`schema.sql` 会在第一次启动 Postgres 时自动执行，建好所有表 + `hybrid_search` RPC。

## 2. 切换后端

把应用环境变量改成：

```
STORAGE_DRIVER=selfhost
```

`src/lib/storage/index.server.ts` 会读取这个变量并切到 `selfhostStorage`。前端代码无需任何改动。

> ⚠️ `selfhostStorage` 目前是骨架，所有方法抛 `NotImplementedError`。等你真要部署时，把
> `src/lib/storage/adapters/selfhost.server.ts` 里 `todo()` 调用换成真实实现：
> - Postgres 用 `postgres` (postgres.js) 或 `drizzle-orm`
> - MinIO 用 `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`
> - Auth 用 `jsonwebtoken` 自签 JWT，或挂在 Cloudflare Access / Authelia 后面

## 3. 环境变量对照表

| 用途 | Supabase | Self-host |
|------|----------|-----------|
| 后端选择 | (默认) | `STORAGE_DRIVER=selfhost` |
| 数据库 | `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | `DATABASE_URL=postgres://...` |
| 对象存储 | Supabase Storage | `MINIO_ENDPOINT` / `MINIO_ACCESS_KEY` / `MINIO_SECRET_KEY` / `MINIO_BUCKET` |
| 媒体公开 URL | 自动 | `MINIO_PUBLIC_BASE_URL` |
| 认证密钥 | Supabase Auth | `JWT_SECRET` |
| AI Gateway | `LOVABLE_API_KEY` | `LOVABLE_API_KEY` (或自部署 Ollama) |

## 4. 数据迁移

### 4.1 数据库

```bash
# 从 Supabase 导出 (跳过 auth/storage schema)
pg_dump "$SUPABASE_DB_URL" \
  --schema=public \
  --no-owner --no-privileges \
  --data-only \
  > supabase-data.sql

# 导入到自建
psql "postgres://garden:changeme@localhost:5432/garden" < supabase-data.sql
```

### 4.2 媒体文件

```bash
# 把 Supabase Storage 同步到 MinIO
aws s3 sync \
  s3://your-supabase-bucket \
  s3://media \
  --endpoint-url https://<project>.supabase.co/storage/v1/s3 \
  --source-region auto

aws s3 sync ./local-cache s3://media \
  --endpoint-url http://localhost:9000
```

## 5. 待办（接入 selfhost adapter 时）

- [ ] `bun add postgres @aws-sdk/client-s3 @aws-sdk/s3-request-presigner jsonwebtoken bcryptjs`
- [ ] 实现 `src/lib/storage/adapters/selfhost.server.ts` 全部 `todo()` 占位
- [ ] 把现有 `src/integrations/supabase/auth-*` 替换成自签 JWT 中间件
- [ ] 在 `docker-compose.yml` 旁边加 `Caddyfile`，跑 HTTPS + 反代到 `:3000` 和 `:9000`