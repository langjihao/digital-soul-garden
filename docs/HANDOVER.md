# 交接文档：digital-soul-garden

> 更新于 2026-07-06 · 覆盖 v1–v8.2 全部演进
> 面向：后续接手的开发者 / AI Agent
> ⚠️ 本文档在公开仓库中：不写任何密钥值与私密运维信息，敏感配置一律指向服务器上的 `/etc/garden.env`

---

## 0. 三十秒速览

- **线上**：https://blog.iqiqiqi.me ，Nuxt 4 全栈站点，跑在 DigitalOcean droplet（2C/3.8G/2G swap）
- **链路**：Cloudflare DNS（CNAME → Tunnel）→ cloudflared 隧道服务 → 127.0.0.1:3000 → systemd `digital-soul-garden.service` → Node（Nitro 产物）
- **发布**：push 到 main 即自动上线（GitHub Actions → SSH → `deploy.sh`），全程 1–2 分钟
- **AI**：孪生问答（文章级/全站双范围）、tl;dr 摘要、混合检索全部真实推理，多级降级永不白屏
- **代码**：本仓库 main 分支；老站（TanStack）源码在 `legacy-tanstack` 分支

## 1. 目录速图

```
app/
├── app.vue                     # 壳：Header/Footer/⌘K/孪生浮窗
├── assets/css/main.css        # ★ 设计系统唯一真源（CSS 变量双主题 + 动效关键帧）
├── components/
│   ├── TwinChat.vue            # 孪生对话面板：SSE 解析、文章页「本文/全站」范围切换
│   ├── TwinSummary.vue         # 文章 tl;dr 卡
│   ├── PostComments.vue        # giscus 评论（运行时 env 配置，未配置自动隐藏）
│   ├── LifeHeatmap/LifeShelfCard.vue  # /life 记录墙组件
│   └── CommandPalette.vue      # ⌘K（客户端词法索引）
├── pages/  index/posts(+[slug])/tweets/media/about/archive/tags/life
server/
├── utils/
│   ├── llm.ts                  # ★ 推理 provider 链（见 §3）
│   ├── embeddings.ts           # ★ 混合检索：词法+向量等权（见 §4）
│   ├── gardenIndex.ts          # 内容 chunk 化 + 词法打分 + 文章全文缓存
│   ├── rateLimit.ts            # 孪生每 IP 限流（10s 冷却 + 日 40，env 可调）
│   ├── sharedStore.ts          # 跨 release 数据目录读写（GARDEN_SHARED_DIR）
│   └── life/                   # 豆瓣/微信读书/Keep 同步（douban/weread/keep/store）
├── api/twin/chat.post.ts       # SSE 流式问答，scope=/posts/* 注入全文
├── api/twin/summary.get.ts     # 摘要，持久化+内容哈希失效
├── api/life/{index.get,sync.post}.ts   # 记录墙数据 / 同步入口（Bearer 鉴权）
├── routes/og/posts/[slug].get.ts       # 动态 OG 图（SVG→sharp，1200×630）
└── routes/{rss.xml,sitemap.xml}.get.ts
content/  posts/*.md  tweets/*.yml  media/*.yml    # 内容唯一真源
deploy.sh                       # 一键部署（构建→冒烟→切换→验证→自动回滚）
.github/workflows/deploy.yml    # push main → SSH 部署
```

## 2. 服务器布局与发布

- 产物：`/var/www/digital-soul-garden/releases/<ts>/.output`，`current` 软链指向生效版本
- 服务：systemd 单元 `digital-soul-garden.service`（User=www-data，EnvironmentFile=`/etc/garden.env`，PORT=3000）
- 跨 release 数据：`/var/www/digital-soul-garden/shared/`（向量缓存 embeddings.json、摘要 summaries.json、life.json、豆瓣封面 covers/）
- **发布方式一**（推荐）：push 到 main → Actions 用受限部署密钥 SSH 进服务器执行 `git pull + deploy.sh`。密钥在 authorized_keys 里带 forced command，只能触发部署
- **发布方式二**：服务器上 `cd /root/dev/garden-next && ./deploy.sh`
- **回滚**：`ln -sfn <上一个release> /var/www/digital-soul-garden/current && systemctl restart digital-soul-garden`（deploy.sh 失败时自动做这件事；保留最近 5 个 release）
- 开发：`./restart-dev.sh` → 127.0.0.1:3001（勿用 `pkill -f "nuxt dev"`，会误杀自身）

## 3. 推理 provider 链（server/utils/llm.ts）

按序尝试，429/5xx/流中 error 帧/空输出自动降档到下一个：

1. **OpenRouter 免费池**（`OPENROUTER_API_KEY`）：默认 `qwen/qwen3-next-80b-a3b-instruct:free` → `nvidia/nemotron-3-super-120b-a12b:free`，`OPENROUTER_MODELS` 逗号分隔可换。**免费池上游 429 是常态**，偶发全链降级几十秒后自愈
2. **Anthropic**（`ANTHROPIC_API_KEY`，可选未配）
3. **Gemini**（`GEMINI_API_KEY`）：`gemini-3.5-flash`(5 RPM) → `gemini-2.5-flash-lite`(10 RPM)。**必须 `thinkingConfig.thinkingBudget=0`**，否则思考吃光 token 正文为空（已内置，`GEMINI_THINKING_BUDGET` 可调）
4. **检索降级**：返回真实检索结果 + 稍后再试提示（`degraded`）；完全无 key 时为演示模式（`demo`）

流式（chat）与非流式（summary）各有实现；某 provider 已输出部分内容后中断则不再切换（防重复输出）。

## 4. 混合检索（server/utils/embeddings.ts）

- `gemini-embedding-001`，768 维（matryoshka 截断 + L2 归一化），taskType 区分 DOCUMENT/QUERY
- 文档向量按 `sha1(kind|path|text)` 增量嵌入，落盘 `shared/embeddings.json`，内容一变自动重嵌
- 最终分 = 0.5×归一化词法分 + 0.5×余弦；分数 <0.15 不硬凑
- 任何失败（无 key/限流/网络）静默退回纯词法（`gardenIndex.ts` 的 2-gram 打分）
- 注意：**embedding 只有 Gemini 来源**（OpenRouter 无 embedding 接口），删 Gemini key 检索会退词法

## 5. 环境变量（/etc/garden.env，值只在服务器上）

| 变量 | 用途 |
| --- | --- |
| `OPENROUTER_API_KEY` / `OPENROUTER_MODELS` | 推理首选来源 / 降档序列 |
| `GEMINI_API_KEY` / `GEMINI_MODEL` / `GEMINI_MODEL_LITE` / `GEMINI_THINKING_BUDGET` | 推理次选 + 向量检索 |
| `ANTHROPIC_API_KEY` / `TWIN_MODEL` | 可选，配置后排在 OpenRouter 之后、Gemini 之前 |
| `GARDEN_SHARED_DIR` | 跨 release 数据目录 |
| `TWIN_RATE_COOLDOWN_MS` / `TWIN_RATE_DAILY_MAX` | 孪生每 IP 限流阈值（默认 10s / 40 条） |
| `NUXT_PUBLIC_GISCUS_REPO` / `_REPO_ID` / `_CATEGORY` / `_CATEGORY_ID` | giscus 评论（运行时读取，改后 restart 即生效免构建） |
| `DOUBAN_NAME` / `WEREAD_COOKIE` / `KEEP_MOBILE`+`KEEP_PASSWORD` / `LIFE_SYNC_TOKEN` / `LIFE_DATA_DIR` | /life 记录墙数据源与同步鉴权 |

GitHub Actions Secrets：`DEPLOY_HOST`、`DEPLOY_SSH_KEY`（受限部署密钥私钥）。

## 6. 踩坑记录（必读）

1. **Gemini 思考模式**：3.5/2.5 系列默认开思考，`maxOutputTokens` 会被思考耗尽导致正文为空 → `thinkingBudget: 0`（§3）
2. **OpenRouter `openrouter/free` 自动路由不可用于中文站**：会路由到用英文回答中文的模型，质量不可控，务必点名模型
3. **`pkill -f "nuxt dev"` 会自杀**：匹配到自身的 bash 包装，用 `restart-dev.sh`
4. **@nuxt/content v3 需要 better-sqlite3**：缺失时 dev server 停在交互确认上假死（端口不监听但进程活着）
5. **自定义指令插件不能 `.client.ts`**：SSR 解析 `v-reveal` 需 `getSSRProps`，用通用插件 + `import.meta.client` 分支
6. **error.vue 是独立入口**：不经过 app.vue，防 FOUC 脚本必须放 `nuxt.config.ts` 的 `app.head.script`
7. **CSS mask 作用于子元素**：网格背景用绝对定位兄弟层
8. **服务器内存 3.8G**：构建峰值 ~1.1G，别并发跑多个 build
9. **deploy.sh 会清理旧 release（保留 5 个）**：需要长期保留的产物别放 releases/ 下
10. **豆瓣图床防盗链（418）**：封面走服务端代理并带 douban referer（`server/utils/life/`）

## 7. 当前待办

- [ ] giscus app 安装（github.com/apps/giscus → 选本仓库），装完评论即可收发；env 四件套已配置
- [ ] /life 转正：填豆瓣/微信读书/Keep 凭证与 `LIFE_SYNC_TOKEN`，建每日 cron POST `/api/life/sync`
- [ ] 站点监控告警（当前无存活监测）
- [ ] ⌘K 升级语义搜索（复用已有向量索引，加 `/api/search` 即可）
- [ ] 文章页 ISR/预渲染 + Cloudflare 缓存规则
- [ ] 真实 i18n 内容；media 页首图 4:3 重绘；碎念 issue 链接接入 Discussions
- [ ] 计划中：独立的 LiteLLM 个人 API 网关，建成后在 llm.ts 链头加 OpenAI 兼容分支指向它

## 8. 版本史

| tag | 内容 |
| --- | --- |
| v1–v3 | 终端美学骨架、动效系统、⌘K/归档/标签/RSS/sitemap |
| v4–v5 | AI 孪生（SSE+RAG+演示降级）、SEO/OG、404、移动端打磨 |
| v6 | Gemini 接入：provider 链、文章级/全站双范围问答、thinkingBudget 修复 |
| v7–v7.1 | /life 记录墙：三源同步、热力图、封面墙、豆瓣封面代理 |
| v8 | 混合检索、giscus、动态 OG 图、摘要持久化、deploy.sh、README |
| v8.1 | 每 IP 限流、GitHub Actions 自动部署 |
| v8.2 | 推理首选切 OpenRouter 免费池（多模型降档） |

各版本截图档案在服务器 `/root/dev/site-iterations/`（不入库，23MB）。
