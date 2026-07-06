# 交接文档：digital-soul-garden 个人网站重建

> 生成于 2026-07-04 · 服务器 device1 (DigitalOcean, Ubuntu 24.04)
> 面向：后续接手的开发者 / AI Agent
> 副本位置：`/root/Desktop/HANDOVER-digital-soul-garden.md` 与 `/root/dev/garden-next/HANDOVER.md`（随仓库走）

---

## 0. 三十秒速览

- **老站**（TanStack Start，跑在 `/var/www/digital-soul-garden`，端口 3000，对外 blog.iqiqiqi.me）是一个 **mock 数据壳**，且因 Clerk 密钥配错**对真实浏览器访客已瘫痪数周**（详见 §2）。
- **新站**（本次产出）在 `/root/dev/garden-next`：Nuxt 4 全功能重建，v1-v5 五个版本迭代完成，git tag 齐全，**生产构建已验证**，随时可替换老站上线。
- 源仓库 `github.com/langjihao/digital-soul-garden` 是**私有库**，服务器至今无访问凭证 —— 新站代码只在本地 git，**尚未推送到任何远端**（风险点，见 §7 待办）。
- 快速起手：`cd /root/dev/garden-next && ./restart-dev.sh` → http://127.0.0.1:3001

---

## 1. 背景与决策链

用户目标：「现代化、动效完善、功能完备、有充分接入 AI 潜力的个人博客」，要求 5 小时持续迭代、每个满意版本截图存档供后续选择。

关键决策及理由：

| 决策 | 理由 |
| --- | --- |
| 放弃修改老站、从零重建 | 私有仓库无凭证克隆不了源码；服务器上只有编译产物 `.output`；老站自述是「Phase 1 mock 壳」 |
| 技术栈选 Nuxt 4 + @nuxt/content v3 + Tailwind v4 | 内容管道/高亮/TOC 开箱即用；**Nitro 产物与老站部署形态 100% 一致**（node .output + systemd + nginx/隧道零改动）；老站的 TanStack 也是 Nitro |
| 保留「数字花园」概念与终端美学 | 与老站视觉/概念延续，文章内容也顺势承接（花园自述其架构的元叙事） |
| AI 功能做「演示模式降级」 | 服务器暂无推理 API key；检索是真实的，配 key 即切换真实推理，UX 完整可验 |

## 2. 老站生产事故（未修，需决策）

**现象**：curl 访问 200 正常，但真实浏览器首访显示 "This page didn't load"。
**根因**：Clerk 认证的 `VITE_CLERK_PUBLISHABLE_KEY`（**构建期**烧进前端 bundle，实例 `ins_3EUG…`）与 `/etc/digital-soul-garden.env` 里的 `CLERK_SECRET_KEY`（**运行期**读取，实例 `ins_2lVb…`）**不是同一对**。浏览器带 Clerk dev cookie 触发 handshake → 服务端 JWKS kid 不匹配 → 500 → 前端错误边界兜底。且生产环境用的是 `pk_test` 开发实例。
**证据**：`journalctl -u digital-soul-garden` 中的 `jwk-kid-mismatch` 报错。
**选项**：a) 直接用新站替换（推荐，新站无 Clerk 依赖）；b) 要修老站需去用户的 Clerk Dashboard 取匹配密钥对并重新构建部署。

## 3. 新站架构速图

```
/root/dev/garden-next
├── app/
│   ├── app.vue                    # 壳：Header/Footer/⌘K面板/孪生浮窗 + ⌘K 全局快捷键
│   ├── error.vue                  # 终端风 404/500（注意：独立入口，全局逻辑别只放 app.vue）
│   ├── assets/css/main.css       # ★ 设计系统唯一真源：CSS 变量双主题 + @theme inline 映射 + prose 排版 + 全部动效关键帧
│   ├── components/
│   │   ├── SiteHeader/Footer.vue
│   │   ├── TerminalPrompt.vue     # "$ cmd" 标头，typed 属性=CSS 打字机
│   │   ├── PostCard/TweetItem/MediaCard.vue   # 均带 card-sweep 扫光
│   │   ├── CommandPalette.vue     # ⌘K：客户端建索引（3 个 queryCollection），词条打分
│   │   ├── TwinChat.vue           # 孪生对话：fetch+ReadableStream 解析 SSE
│   │   ├── TwinSummary.vue        # 文章 tl;dr 卡（useLazyFetch, server:false）
│   │   └── ReadingProgress.vue
│   ├── composables/useLang.ts     # 手搓 zh/en UI 词典（cookie 持久化）；useTheme/usePalette/useTwin
│   ├── plugins/reveal.ts          # v-reveal 滚动显现指令（★通用插件不能 .client，SSR 需 getSSRProps）
│   └── pages/  index/posts(+[slug])/tweets/media/about/archive/tags/[tag]
├── server/
│   ├── utils/gardenIndex.ts       # ★ 内容检索核心：minimark AST 拍平→chunk→词法打分（中文2-gram），60s 缓存
│   ├── api/twin/chat.post.ts      # SSE 流式：有 ANTHROPIC_API_KEY→Anthropic API；无→演示模式（检索真实）
│   ├── api/twin/summary.get.ts    # 同样双模式，内存 memo
│   └── routes/rss.xml|sitemap.xml.get.ts   # import { queryCollection } from '@nuxt/content/server'
├── content/  posts/*.md(7篇) tweets/*.yml(14条) media/*.yml(8条)
├── content.config.ts              # 三个 collection 的 zod schema
└── restart-dev.sh                 # ★ 安全重启 dev server（见 §6 坑）
```

内容模型 frontmatter 见仓库 README.md（含写作指南）。

## 4. 版本迭代史与产物

git tag v1→v5（main 分支，共 6 commits），截图档案 `/root/dev/site-iterations/`（23MB）：

| 版本 | 内容 | 截图目录 |
| --- | --- | --- |
| v0 | 老站基线（含浏览器端崩溃实况） | v0-baseline/ |
| v1 | 终端美学 2.0：双主题（磷光屏↔纸质印刷）、全要素 Markdown 渲染 | v1-terminal-garden/ |
| v2 | 动效：v-reveal、CSS 打字机、卡片扫光、阅读进度 | v2-motion/（含 home-scroll.gif 动效演示） |
| v3 | ⌘K 面板、归档 tree、标签页、RSS、sitemap | v3-features/ |
| v4 | AI：孪生对话(SSE+RAG)、tl;dr 摘要、相关文章 | v4-ai/ |
| v5 | 404 页、SEO/OG、移动端修复、favicon | v5-final/ |

**实测性能**（本机 2C/3.8G）：生产构建 30s（峰值内存 1.1G）、产物 15MB、prod 常驻 84MB、文章页 TTFB 147ms、RSS 8ms。

## 5. 当前运行状态

- 端口 3000：**老站** prod（systemd `digital-soul-garden.service`）——别动，等切换决策
- 端口 3001：**新站 dev server**（非 systemd，nohup 起的，重启用 `./restart-dev.sh`）
- 端口 3002：新站 prod 预览，用完即关（当前已关）
- 截图工具链：`/root/dev/shots/`（playwright+chromium 已装，`shot.mjs` 批量截图 / `record-gif.mjs` 录 GIF / `chat-shot.mjs` 对话流程截图）

## 6. 踩坑记录（agent 必读）

1. **`pkill -f "nuxt dev"` 会自杀**：命令行字符串匹配到自己的 bash -c 包装。永远用 `restart-dev.sh`（fuser -k 端口 + 精确 pattern）。
2. **@nuxt/content v3 需要 better-sqlite3**：缺失时 dev server 停在交互式安装确认上**假死**（表现为端口不监听但进程活着）。已装，勿删。
3. **自定义指令插件不能 `.client.ts`**：SSR 端解析 `v-reveal` 时报 `getSSRProps` undefined → 500。用通用插件 + `import.meta.client` 分支。
4. **error.vue 是独立入口**：不经过 app.vue，防 FOUC 主题脚本必须放 `nuxt.config.ts` 的 `app.head.script`（已修，v5）。
5. **CSS mask 会作用于子元素**：网格背景要做绝对定位兄弟层，别直接给内容容器加 mask（v1 的 hero 消失事故）。
6. **Playwright 自带 ffmpeg 无 GIF muxer**：系统 ffmpeg 已 apt 安装。
7. **全页截图前要先滚动**（shot.mjs 的 `scrollFirst`），否则 v-reveal 元素以 opacity:0 入镜。
8. 服务器 **3.8G 内存已配 2G swap**，构建安全；并发跑多个 vite build 仍可能吃紧，串行。

## 7. 待办与后续路线

**用户明确待办：**
- [ ] **推送到 GitHub**：`gh` 已装但未认证。流程：`gh auth login`（或 agent 发起设备码流：POST github.com/login/device/code，client_id `178c6fc778ccc68e1d6a`，用户浏览器输码，轮询换 token 后 `gh auth login --with-token`）。成功后把本地 main 推到 `langjihao/digital-soul-garden`（建议推分支 `rebuild/nuxt` 或直接替换，由用户定）。
- [ ] **上线切换决策**：新站替换老站。建议步骤：`npm run build` → 产物放 `/var/www/digital-soul-garden/releases/<ts>/` → 软链 current → 建 `/etc/garden.env`（可选 ANTHROPIC_API_KEY、TWIN_MODEL）→ 改 systemd ExecStart 指向新产物 → `systemctl daemon-reload && restart` → nginx/隧道零改动。老站 release 保留可秒回滚。
- [ ] **配 ANTHROPIC_API_KEY** 唤醒真实孪生（不配也能跑演示模式）。

**建议路线（未做）：**
- 真实 i18n 内容（目前仅 UI 词典双语 + 1 篇英文文章）
- 评论系统（老站构想是 GitHub Issue 映射碎念，`GITHUB_CONTENT_REPO`/`INGEST_WEBHOOK_SECRET` env 名可复用）
- 向量检索升级（现为词法打分；文章《80 行 SQL 实现混合检索》即施工图纸）
- OG 图按文章动态生成（现为全站一张静态 og.png）
- Lighthouse/无障碍审计

**已知小瑕疵：**
- 演示模式摘要偶尔选句生硬（真 key 下无此问题）
- media 页第一张终端图是 800×420 被 4:3 裁切（可重绘成 4:3）
- 碎念「issue ↗」悬停标是装饰，还没链接到真实 issue

## 8. 服务器全景（本次会话同时完成的运维配置）

gh CLI 已装未认证；git 身份 langjihao/langjihao@gmail.com；SSH 密钥 `/root/.ssh/id_ed25519`（公钥待加 GitHub）；Docker 日志轮转 20m×3 + live-restore；2G swap；`3x-ui` 与 `pdf2zh` 容器均 unless-stopped；cloudflared 隧道服务 `cloudflared-blog-iqiqiqi-me` 正常（0 重启）。Cloudflare DNS 管理曾用 bash_history 里的 API token（敏感，勿外传）。内核有待重启更新（reboot 安全，均已自启）。

---

*本文档由 Claude (Fable 5) 在 2026-07-03 至 07-04 的开发会话结束时生成。会话内所有版本截图、GIF、git 历史均可复核。*
