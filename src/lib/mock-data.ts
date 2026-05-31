// Mock data for Phase 1 — replaced by GitHub-backed loaders in Phase 2.

import type { Locale } from "./i18n/translations";

export type Localized = Record<Locale, string>;
export const pick = (v: Localized | string, locale: Locale): string =>
  typeof v === "string" ? v : v[locale] ?? v.zh;

export interface MockPost {
  slug: string;
  title: Localized;
  summary: Localized;
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
  body?: { zh: string[]; en: string[] };
}

export interface MockTweet {
  id: number;
  body: Localized;
  publishedAt: string;
  labels: string[];
  reactions: number;
  comments: number;
}

export interface MockMedia {
  id: string;
  kind: "image" | "audio";
  src: string;
  alt: Localized;
  caption?: Localized;
  duration?: string;
}

export const mockPosts: MockPost[] = [
  {
    slug: "building-a-digital-twin",
    title: {
      zh: "用 RAG、pgvector 与 ⌘K 打造数字孪生",
      en: "Building a Digital Twin with RAG, pgvector, and Cmd+K",
    },
    summary: {
      zh: "如何把一个个人博客变成可对话的智能体——内容继续放在 GitHub，向量留在 Postgres，访客通过流式对话与懂我口吻的孪生交流。",
      en: "How I turned a personal blog into an agentic surface — content stays in GitHub, embeddings live in Postgres, and the visitor talks to a streaming chat that knows my voice.",
    },
    publishedAt: "2026-05-12",
    readingMinutes: 12,
    tags: ["rag", "pgvector", "tanstack", "ai"],
    body: {
      zh: [
        "数字孪生不是把博客塞进一个聊天框就完事的把戏。真正的难点在于：让一个语言模型在不撒谎的前提下，用你自己的口吻、引用你写过的东西作答。",
        "为此我把内容主权牢牢攥在 GitHub 私有仓库里，每次 push 触发 CI 把变更 diff 出来，调用嵌入模型写入 Supabase 的 pgvector。Postgres 同时存全文索引与向量，混合检索的 SQL 不到 80 行。",
        "前端走 TanStack Start。⌘K 命令面板既是搜索入口也是对话入口——选中文章直接跳转,输入问题则走 RAG 流式管线。所有响应都带引用,点开就是源文段落。",
        "下一步计划:给孪生加一段 200 token 的人设 prompt,把口吻锁死。等你读到这一段时,大概率已经上线了。",
      ],
      en: [
        "A digital twin isn't just stuffing your blog into a chat box. The hard part is getting a language model to answer in your own voice, cite what you actually wrote, and never hallucinate.",
        "To do that I keep content sovereignty in a private GitHub repo. Every push triggers CI that diffs the change, calls an embedding model, and writes into Supabase's pgvector. Postgres holds both full-text and vector indexes — the hybrid search SQL is under 80 lines.",
        "The frontend is TanStack Start. The ⌘K palette doubles as search and chat entrypoint — pick a post to jump, type a question to stream a RAG answer. Every response carries inline citations back to the source paragraph.",
        "Next step: lock the voice with a 200-token persona prompt. By the time you read this, it's probably already live.",
      ],
    },
  },
  {
    slug: "git-as-cms",
    title: {
      zh: "把 Git 当 CMS：用 PR 发布内容，告别所见即所得",
      en: "Git as a CMS: shipping content with PRs, not WYSIWYG",
    },
    summary: {
      zh: "一份务实笔记：把私有仓库作为文章、碎念与媒体的唯一来源，CI 负责 diff、摘要与索引。",
      en: "A pragmatic write-up on using a private repo as the source of truth for posts, tweets, and media — with a CI step that diffs, summarises, and indexes.",
    },
    publishedAt: "2026-04-28",
    readingMinutes: 8,
    tags: ["devx", "github-actions", "writing"],
  },
  {
    slug: "hybrid-search-bm25-cosine",
    title: {
      zh: "80 行 SQL 实现混合检索：BM25 + 余弦合二为一",
      en: "Hybrid search in 80 lines of SQL: BM25 + cosine in one query",
    },
    summary: {
      zh: "把 ts_rank 与 pgvector 余弦距离合成一个可调权重的得分，附带我生产环境跑的完整 SQL。",
      en: "Combining ts_rank and the pgvector cosine distance into a single, weight-tunable score. Includes the exact SQL I run in production.",
    },
    publishedAt: "2026-04-10",
    readingMinutes: 6,
    tags: ["postgres", "search", "sql"],
  },
  {
    slug: "tanstack-start-notes",
    title: {
      zh: "把 TanStack Start 跑上 Cloudflare Worker 的现场笔记",
      en: "Field notes from shipping TanStack Start to a Cloudflare Worker",
    },
    summary: {
      zh: "从 Next.js 迁移过来的活下来了什么、坏掉了什么，以及在边缘运行时写 server function 时我的三条规矩。",
      en: "What survived the migration from Next.js, what broke, and the three rules I now apply when authoring server functions on edge runtimes.",
    },
    publishedAt: "2026-03-22",
    readingMinutes: 9,
    tags: ["tanstack", "edge", "performance"],
  },
];

export const mockTweets: MockTweet[] = [
  {
    id: 142,
    body: {
      zh: "纯向量召回总会漏掉那些命中稀有词的查询。把 BM25 加回来，对两路再排序。别再迷信向量是魔法。",
      en: "Embedding-only retrieval consistently misses queries that share rare tokens. Add BM25 back. Re-rank both. Stop pretending vectors are magic.",
    },
    publishedAt: "2026-05-30T09:14:00Z",
    labels: ["tweet", "search"],
    reactions: 38,
    comments: 6,
  },
  {
    id: 141,
    body: {
      zh: "今年最爽的 DX 升级：每篇博客就是私有仓库里的一个 `.mdx`，`git push` 即发布。",
      en: "The best DX upgrade of my year: every blog post is a `.mdx` file in a private repo, and `git push` is the publish button.",
    },
    publishedAt: "2026-05-28T22:01:00Z",
    labels: ["tweet", "devx"],
    reactions: 22,
    comments: 3,
  },
  {
    id: 140,
    body: {
      zh: "下午花时间教我的网站用我的口吻说话。RAG 上下文 + 200 token 的人设 prompt + 流式输出，效果好得有点诡异。",
      en: "Spent the afternoon teaching my site to talk in my voice. RAG context + a 200-token persona prompt + streaming. It's eerie how well it lands.",
    },
    publishedAt: "2026-05-27T15:46:00Z",
    labels: ["tweet", "ai"],
    reactions: 51,
    comments: 11,
  },
  {
    id: 139,
    body: {
      zh: "`⌘K` 是现代个人站点里被低估的英雄——路由、搜索与对话入口三合一。",
      en: "`⌘K` is the unsung hero of modern personal sites. It's a router, a search bar, and a chat entrypoint in one component.",
    },
    publishedAt: "2026-05-25T11:08:00Z",
    labels: ["tweet", "ui"],
    reactions: 17,
    comments: 2,
  },
];

export const mockMedia: MockMedia[] = [
  {
    id: "m1",
    kind: "image",
    src: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=900&q=70",
    alt: { zh: "深夜的工作台", en: "Workstation at midnight" },
    caption: { zh: "周五夜里，终端泛绿，lo-fi 循环。", en: "Friday night, terminal green, lo-fi on." },
  },
  {
    id: "m2",
    kind: "image",
    src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=70",
    alt: { zh: "屏幕上的代码", en: "Code on screen" },
    caption: { zh: "一段我挺得意的混合检索查询。", en: "A hybrid search query I'm proud of." },
  },
  {
    id: "m3",
    kind: "audio",
    src: "",
    alt: { zh: "语音笔记 — RAG 回顾", en: "Voice note — RAG retrospective" },
    caption: { zh: "3 分钟语音，聊聊如果重做会怎么改。", en: "3-minute voice note on what I'd change." },
    duration: "03:14",
  },
  {
    id: "m4",
    kind: "image",
    src: "https://images.unsplash.com/photo-1551033406-611cf9a28f67?auto=format&fit=crop&w=900&q=70",
    alt: { zh: "机械键盘", en: "Mechanical keyboard" },
    caption: { zh: "新键位 Colemak-DH，第 41 天。", en: "New layout. Colemak-DH, day 41." },
  },
];

export function formatDate(iso: string, locale: Locale = "zh"): string {
  const d = new Date(iso);
  const tag = locale === "zh" ? "zh-CN" : "en-US";
  return d.toLocaleDateString(tag, { year: "numeric", month: "short", day: "numeric" });
}

export function relativeTime(
  iso: string,
  units: { justNow: string; minutesAgo: string; hoursAgo: string; daysAgo: string },
  locale: Locale = "zh"
): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return units.justNow;
  if (m < 60) return `${m} ${units.minutesAgo}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ${units.hoursAgo}`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} ${units.daysAgo}`;
  return new Date(iso).toLocaleDateString(locale === "zh" ? "zh-CN" : "en-US", { month: "short", day: "numeric" });
}