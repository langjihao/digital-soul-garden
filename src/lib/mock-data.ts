// Mock data for Phase 1 — replaced by GitHub-backed loaders in Phase 2.

export interface MockPost {
  slug: string;
  title: string;
  summary: string;
  publishedAt: string;
  readingTime: string;
  tags: string[];
}

export interface MockTweet {
  id: number;
  body: string;
  publishedAt: string;
  labels: string[];
  reactions: number;
  comments: number;
}

export interface MockMedia {
  id: string;
  kind: "image" | "audio";
  src: string;
  alt: string;
  caption?: string;
  duration?: string;
}

export const mockPosts: MockPost[] = [
  {
    slug: "building-a-digital-twin",
    title: "Building a Digital Twin with RAG, pgvector, and Cmd+K",
    summary:
      "How I turned a personal blog into an agentic surface — content stays in GitHub, embeddings live in Postgres, and the visitor talks to a streaming chat that knows my voice.",
    publishedAt: "2026-05-12",
    readingTime: "12 min",
    tags: ["rag", "pgvector", "tanstack", "ai"],
  },
  {
    slug: "git-as-cms",
    title: "Git as a CMS: shipping content with PRs, not WYSIWYG",
    summary:
      "A pragmatic write-up on using a private repo as the source of truth for posts, tweets, and media — with a CI step that diffs, summarises, and indexes.",
    publishedAt: "2026-04-28",
    readingTime: "8 min",
    tags: ["devx", "github-actions", "writing"],
  },
  {
    slug: "hybrid-search-bm25-cosine",
    title: "Hybrid search in 80 lines of SQL: BM25 + cosine in one query",
    summary:
      "Combining ts_rank and the pgvector cosine distance into a single, weight-tunable score. Includes the exact SQL I run in production.",
    publishedAt: "2026-04-10",
    readingTime: "6 min",
    tags: ["postgres", "search", "sql"],
  },
  {
    slug: "tanstack-start-notes",
    title: "Field notes from shipping TanStack Start to a Cloudflare Worker",
    summary:
      "What survived the migration from Next.js, what broke, and the three rules I now apply when authoring server functions on edge runtimes.",
    publishedAt: "2026-03-22",
    readingTime: "9 min",
    tags: ["tanstack", "edge", "performance"],
  },
];

export const mockTweets: MockTweet[] = [
  {
    id: 142,
    body:
      "Embedding-only retrieval consistently misses queries that share rare tokens. Add BM25 back. Re-rank both. Stop pretending vectors are magic.",
    publishedAt: "2026-05-30T09:14:00Z",
    labels: ["tweet", "search"],
    reactions: 38,
    comments: 6,
  },
  {
    id: 141,
    body:
      "The best DX upgrade of my year: every blog post is a `.mdx` file in a private repo, and `git push` is the publish button.",
    publishedAt: "2026-05-28T22:01:00Z",
    labels: ["tweet", "devx"],
    reactions: 22,
    comments: 3,
  },
  {
    id: 140,
    body:
      "Spent the afternoon teaching my site to talk in my voice. RAG context + a 200-token persona prompt + streaming. It's eerie how well it lands.",
    publishedAt: "2026-05-27T15:46:00Z",
    labels: ["tweet", "ai"],
    reactions: 51,
    comments: 11,
  },
  {
    id: 139,
    body:
      "`⌘K` is the unsung hero of modern personal sites. It's a router, a search bar, and a chat entrypoint in one component.",
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
    alt: "Workstation at midnight",
    caption: "Friday night, terminal green, lo-fi on.",
  },
  {
    id: "m2",
    kind: "image",
    src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=900&q=70",
    alt: "Code on screen",
    caption: "A hybrid search query I'm proud of.",
  },
  {
    id: "m3",
    kind: "audio",
    src: "",
    alt: "Voice note — RAG retrospective",
    caption: "3-minute voice note on what I'd change.",
    duration: "03:14",
  },
  {
    id: "m4",
    kind: "image",
    src: "https://images.unsplash.com/photo-1551033406-611cf9a28f67?auto=format&fit=crop&w=900&q=70",
    alt: "Mechanical keyboard",
    caption: "New layout. Colemak-DH, day 41.",
  },
];

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}