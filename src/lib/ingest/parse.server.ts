/**
 * Markdown frontmatter parsing + content hashing for idempotent ingest.
 */
import matter from "gray-matter";
import { createHash } from "node:crypto";

export interface ParsedPost {
  kind: "post";
  /** GitHub path, e.g. `posts/2026-05-30-hello.md` */
  sourceId: string;
  slug: string;
  title: string;
  titleEn: string | null;
  summary: string | null;
  summaryEn: string | null;
  tags: string[];
  author: string | null;
  publishedAt: string | null;
  bodyMd: string;
  contentHash: string;
  htmlUrl: string;
  meta: Record<string, unknown>;
}

export interface ParsedMedia {
  kind: "media";
  sourceId: string;
  slug: string;
  title: string;
  type: "image" | "audio" | "video";
  url: string;
  duration: string | null;
  caption: string | null;
  publishedAt: string | null;
  contentHash: string;
  htmlUrl: string;
  meta: Record<string, unknown>;
}

export interface ParsedTweet {
  kind: "tweet";
  /** Issue number stringified */
  sourceId: string;
  title: string | null;
  body: string;
  labels: string[];
  author: string | null;
  publishedAt: string;
  state: "open" | "closed";
  contentHash: string;
  htmlUrl: string;
}

function hash(s: string): string {
  return createHash("sha256").update(s).digest("hex").slice(0, 32);
}

function slugFromPath(path: string): string {
  const base = path.split("/").pop()!.replace(/\.md$/i, "");
  return base.replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

export function parsePost(path: string, raw: string, htmlUrl: string): ParsedPost {
  const { data, content } = matter(raw);
  const slug = (data.slug as string | undefined)?.trim() || slugFromPath(path);
  const title = (data.title as string | undefined)?.trim() || slug;
  const titleEn = (data.title_en as string | undefined)?.trim() || null;
  const summary = (data.summary as string | undefined)?.trim() || null;
  const summaryEn = (data.summary_en as string | undefined)?.trim() || null;
  const tags = Array.isArray(data.tags)
    ? (data.tags as unknown[]).map((t) => String(t).trim()).filter(Boolean)
    : [];
  const author = (data.author as string | undefined)?.trim() || null;
  const publishedAt = data.published_at
    ? new Date(String(data.published_at)).toISOString()
    : null;
  const body = content.trim();
  return {
    kind: "post",
    sourceId: path,
    slug,
    title,
    titleEn,
    summary,
    summaryEn,
    tags,
    author,
    publishedAt,
    bodyMd: body,
    contentHash: hash(raw),
    htmlUrl,
    meta: {
      titleEn,
      summaryEn,
      explicitTags: tags,
    },
  };
}

export function parseMedia(path: string, raw: string, htmlUrl: string): ParsedMedia {
  const { data, content } = matter(raw);
  const slug = (data.slug as string | undefined)?.trim() || slugFromPath(path);
  const title = (data.title as string | undefined)?.trim() || slug;
  const type = (data.type as ParsedMedia["type"] | undefined) ?? "image";
  const url = (data.url as string | undefined)?.trim() || "";
  const duration = (data.duration as string | undefined)?.trim() || null;
  const caption = content.trim() || null;
  const publishedAt = data.published_at
    ? new Date(String(data.published_at)).toISOString()
    : null;
  return {
    kind: "media",
    sourceId: path,
    slug,
    title,
    type,
    url,
    duration,
    caption,
    publishedAt,
    contentHash: hash(raw),
    htmlUrl,
    meta: { type, url, duration, caption },
  };
}

export function parseIssueAsTweet(it: {
  number: number;
  title: string;
  body: string | null;
  labels: string[];
  user: string | null;
  state: "open" | "closed";
  createdAt: string;
  htmlUrl: string;
}): ParsedTweet {
  const body = (it.body ?? "").trim();
  const title = it.title?.trim() || null;
  return {
    kind: "tweet",
    sourceId: String(it.number),
    title,
    body,
    labels: it.labels,
    author: it.user,
    publishedAt: it.createdAt,
    state: it.state,
    contentHash: hash(`${title ?? ""}\n${body}\n${it.state}\n${it.labels.join(",")}`),
    htmlUrl: it.htmlUrl,
  };
}