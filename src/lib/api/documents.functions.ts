/**
 * Document server functions — bridge real Supabase-backed documents to
 * the existing `MockPost` UI shape so the frontend can stay unchanged.
 *
 * Falls back gracefully: if the table is empty (cold start before the
 * first GitHub ingest), routes can use `mockPosts` instead.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getStorage } from "@/lib/storage/index.server";
import type { DocumentRecord } from "@/lib/storage/types";
import type { MockPost, MockTweet, MockMedia, Localized } from "@/lib/mock-data";

/* ------------------------------------------------------------------ */
/* Mapping helpers                                                     */
/* ------------------------------------------------------------------ */

function loc(zh: string | null | undefined, en: string | null | undefined): Localized {
  const z = (zh ?? "").toString();
  const e = (en ?? zh ?? "").toString();
  return { zh: z, en: e };
}

function tagsFromMeta(meta: Record<string, unknown>): string[] {
  const t = meta.tags;
  if (Array.isArray(t)) return t.map(String);
  return [];
}

function readingMinutes(body: string | null): number {
  if (!body) return 1;
  return Math.max(1, Math.round(body.length / 800));
}

function splitParagraphs(md: string | null): string[] {
  if (!md) return [];
  return md
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function docToPost(d: DocumentRecord): MockPost {
  const meta = d.meta ?? {};
  const title = loc(d.title, (meta.title_en as string) ?? d.title);
  const summary = loc(d.summary, (meta.summary_en as string) ?? d.summary);
  const zhBody = splitParagraphs(d.bodyMd);
  const enBody = splitParagraphs((meta.body_en as string) ?? d.bodyMd);
  return {
    slug: d.slug ?? d.id,
    title,
    summary,
    publishedAt: d.publishedAt ?? d.createdAt,
    readingMinutes: readingMinutes(d.bodyMd),
    tags: tagsFromMeta(meta),
    body: { zh: zhBody, en: enBody.length ? enBody : zhBody },
  };
}

function docToTweet(d: DocumentRecord, idx: number): MockTweet {
  const meta = d.meta ?? {};
  return {
    id: idx + 1,
    body: loc(d.bodyMd ?? d.summary ?? "", (meta.body_en as string) ?? d.bodyMd ?? ""),
    publishedAt: d.publishedAt ?? d.createdAt,
    labels: tagsFromMeta(meta),
    reactions: 0,
    comments: 0,
  };
}

function docToMedia(d: DocumentRecord): MockMedia {
  const meta = d.meta ?? {};
  const kind = (meta.media_kind as "image" | "audio") ?? "image";
  return {
    id: d.id,
    kind,
    src: (meta.src as string) ?? "",
    alt: loc(d.title ?? "", (meta.title_en as string) ?? d.title ?? ""),
    caption: d.summary ? loc(d.summary, (meta.summary_en as string) ?? d.summary) : undefined,
    duration: meta.duration as string | undefined,
  };
}

/* ------------------------------------------------------------------ */
/* Server functions                                                    */
/* ------------------------------------------------------------------ */

export const listPostsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { items } = await getStorage().documents.list({ kind: "post", limit: 50 });
    return { items: items.map(docToPost) };
  } catch (e) {
    console.warn("[documents] listPosts failed:", (e as Error).message);
    return { items: [] as MockPost[] };
  }
});

export const listTweetsFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { items } = await getStorage().documents.list({ kind: "tweet", limit: 50 });
    return { items: items.map(docToTweet) };
  } catch (e) {
    console.warn("[documents] listTweets failed:", (e as Error).message);
    return { items: [] as MockTweet[] };
  }
});

export const listMediaFn = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { items } = await getStorage().documents.list({ kind: "media", limit: 50 });
    return { items: items.map(docToMedia) };
  } catch (e) {
    console.warn("[documents] listMedia failed:", (e as Error).message);
    return { items: [] as MockMedia[] };
  }
});

export const getPostBySlugFn = createServerFn({ method: "GET" })
  .inputValidator(z.object({ slug: z.string().min(1).max(256) }))
  .handler(async ({ data }) => {
    try {
      const doc = await getStorage().documents.getBySlug(data.slug);
      return doc ? { post: docToPost(doc) } : { post: null };
    } catch (e) {
      console.warn("[documents] getPostBySlug failed:", (e as Error).message);
      return { post: null };
    }
  });