## 目标

用 Clerk 完全替换 Supabase Auth。前端用 `@clerk/tanstack-react-start` SDK，server functions 用 Clerk 的 JWT 校验身份。Supabase 仍作为数据库，但 `user_id` 字段从 `uuid` (引用 `auth.users`) 改为 `text` (存 Clerk userId)。评论区允许匿名提交。

## 需要的密钥

需要你去 Clerk Dashboard 创建一个 application，然后提供:
- `VITE_CLERK_PUBLISHABLE_KEY` (前端用，`pk_test_...`)
- `CLERK_SECRET_KEY` (server function 校验 JWT 用，`sk_test_...`)

登录方式开启 **Email Code (OTP)** + **GitHub** + **Google**。GitHub / Google 现在可以先用 Clerk 提供的开发凭据 (Clerk 默认就行)，等上线再换自己的。

## 实施步骤

### 1. 依赖与环境
- `bun add @clerk/tanstack-react-start`
- 通过 `add_secret` 加入 `VITE_CLERK_PUBLISHABLE_KEY`、`CLERK_SECRET_KEY`

### 2. 数据库迁移 (新建一个 migration)
- 删除原表 RLS 中所有 `auth.uid()` 相关 policy
- 把 `chat_sessions.user_id`、`chat_messages` 间接引用、`tweet_reactions.user_id` 从 `uuid` 改成 `text`
- 新建 `comments` 表 (作者匿名兼容):
  ```sql
  create table public.comments (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null,
    parent_id uuid references public.comments(id) on delete cascade,
    clerk_user_id text,        -- 登录用户的 Clerk id, 匿名则 null
    author_name text not null, -- 匿名提交时用户填写, 登录时取 Clerk 用户名
    author_email text,         -- 匿名可选
    body text not null,
    created_at timestamptz not null default now()
  );
  ```
- 新建 `annotations` 表 (划线讨论持久化, 同样允许匿名)
- RLS: 公共表 (documents / chunks / tags / comments / annotations) 允许 anon SELECT；写操作走 server functions 用 service role，不再依赖 `auth.uid()`
- 给所有新表加 `GRANT`，符合 public-schema-grants 规范

### 3. Clerk 集成代码
- 新建 `src/integrations/clerk/`:
  - `client.ts`: 导出 `useUser`/`useAuth`/`SignIn`/`SignedIn`/`SignedOut` 等
  - `server.ts`: 用 `@clerk/backend` 的 `verifyToken` 实现 `requireClerkAuth` server middleware (替代 `requireSupabaseAuth`)，从 `Authorization: Bearer` 头解 Clerk JWT，返回 `{ userId, claims }`
  - `auth-attacher.ts`: server function middleware，自动从 `Clerk` 客户端拿 token 加到 `Authorization` 头
- 更新 `src/start.ts`: 把 `attachSupabaseAuth` 换成 `attachClerkAuth`
- 更新 `src/router.tsx` 和 `__root.tsx`: 包一层 `<ClerkProvider>`，`html lang="zh-CN"` 保留

### 4. 路由/UI
- 新建 `src/routes/sign-in.$.tsx` 和 `src/routes/sign-up.$.tsx`，挂载 Clerk 的 `<SignIn />` / `<SignUp />`（geek 黑主题 + JetBrains Mono 主题变量传给 Clerk appearance）
- 新建 `src/routes/_authenticated.tsx` 作为受保护布局，`beforeLoad` 检测未登录跳 `/sign-in`
- `SiteHeader` 加 `<SignedIn><UserButton/></SignedIn>` + `<SignedOut>` 登录链接
- i18n: 中英文加 `signIn / signUp / signedInAs / signOut` 等条目

### 5. 评论 / 划线 (允许匿名)
- 在 `src/lib/api/comments.functions.ts` 创建 server fn:
  - `listComments({ documentId })`: 公开
  - `createComment({ documentId, parentId?, body, authorName, authorEmail? })`: 不走 auth middleware；如果请求有有效 Clerk token 就把 `clerk_user_id` + 用户名写入，否则当匿名
  - 校验 `authorName` 必填、`body` 长度、简单 rate-limit (后续 phase)
- 同样新增 `annotations.functions.ts`
- 更新 `CommentSection.tsx` / `AnnotatedArticle.tsx`：
  - 登录态自动填用户名，禁用名字输入框
  - 未登录显示「昵称 + 可选邮箱 + 内容」表单
  - 调用 server fn 持久化，替换原 mock state

### 6. 清理旧 Supabase Auth
- 删除 `src/integrations/supabase/auth-middleware.ts` 和 `auth-attacher.ts` 的引用 (文件本身是自动生成的就留着，但不再 import)
- `chat_sessions` / RAG 聊天的 server fn 改用 `requireClerkAuth`
- 关闭 Supabase 项目里的 Email/Google provider (用 `configure_auth` 把 `disable_signup=true`)，避免双系统混淆

### 7. 文档更新
- `.lovable/plan.md` 增加 "Auth: Clerk" 一节，说明 storage 抽象层里 `AuthProvider` 占位将由 Clerk 实现 (即便目前直接调 SDK)
- `docs/self-host/README.md` 加迁移注记：自建时 Clerk 仍可用 (它是托管服务)，或换 `auth.js` / `lucia`

## 不在本次范围

- GitHub Actions 摄取管道 (Phase 2)
- 评论 rate-limit / 反垃圾 (后续)
- Realtime 评论推送
- 把 storage 抽象层里的 `AuthProvider` 接口真正接到 Clerk (现在直接用 SDK)

## 交付物

- DB migration: 改 user_id 类型 + 新 comments/annotations 表 + RLS/GRANT
- Clerk 前后端集成 (Provider + middleware + attacher + sign-in/up 路由)
- 受保护布局 `_authenticated.tsx`，Header 登录态切换
- 评论 & 划线 server functions (匿名兼容)，组件接入真实持久化
- 移除 Supabase Auth 调用

确认后我开始动手，第一步会先请你贴 Clerk 的两个 key。