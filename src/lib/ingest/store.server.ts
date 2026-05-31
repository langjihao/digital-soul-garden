/**
 * Upsert parsed documents → Supabase. Uses service-role client so writes
 * bypass RLS. Idempotent via (kind, source_id) + content_hash.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { chunkMarkdown } from "./chunk.server";
import { embedMany } from "./embed.server";
import { enrichPost } from "./enrich.server";
import type { ParsedMedia, ParsedPost, ParsedTweet } from "./parse.server";

type Parsed = ParsedPost | ParsedMedia | ParsedTweet;

async function upsertTags(documentId: string, tags: string[]) {
  if (!tags.length) return;
  // Upsert tag rows
  const tagRows = tags.map((name) => ({ name, kind: "topic" }));
  const { data: tagData, error: tagErr } = await supabaseAdmin
    .from("tags")
    .upsert(tagRows as never, { onConflict: "name" })
    .select("id, name");
  if (tagErr) throw tagErr;
  const links = (tagData ?? []).map((t) => ({ document_id: documentId, tag_id: t.id }));
  if (links.length) {
    // Reset links for idempotency
    await supabaseAdmin.from("document_tags").delete().eq("document_id", documentId);
    const { error } = await supabaseAdmin.from("document_tags").insert(links as never);
    if (error) throw error;
  }
}

async function existingHash(kind: Parsed["kind"], sourceId: string): Promise<{ id: string; content_hash: string } | null> {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("id, content_hash")
    .eq("kind", kind)
    .eq("source_id", sourceId)
    .maybeSingle();
  if (error) throw error;
  return (data as { id: string; content_hash: string } | null) ?? null;
}

export interface IngestReport {
  kind: string;
  sourceId: string;
  action: "skipped" | "upserted" | "deleted";
  documentId?: string;
  reason?: string;
}

export async function ingestPost(p: ParsedPost): Promise<IngestReport> {
  const prior = await existingHash("post", p.sourceId);
  if (prior && prior.content_hash === p.contentHash) {
    return { kind: "post", sourceId: p.sourceId, action: "skipped", documentId: prior.id, reason: "hash unchanged" };
  }

  // Enrich: only call AI when summary or tags missing.
  let summary = p.summary;
  let summaryEn = p.summaryEn;
  let tags = p.tags;
  if (!summary || tags.length === 0) {
    try {
      const enriched = await enrichPost({ title: p.title, body: p.bodyMd, existingTags: tags });
      summary = summary || enriched.summary;
      summaryEn = summaryEn || enriched.summary_en;
      if (tags.length === 0) tags = enriched.tags;
    } catch (err) {
      console.warn("[ingest] enrich failed, continuing without:", err);
    }
  }

  const payload = {
    kind: "post" as const,
    source_id: p.sourceId,
    slug: p.slug,
    title: p.title,
    summary,
    body_md: p.bodyMd,
    html: null,
    url_github: p.htmlUrl,
    author: p.author,
    published_at: p.publishedAt,
    content_hash: p.contentHash,
    meta: { ...p.meta, title_en: p.titleEn, summary_en: summaryEn } as never,
  };

  const { data, error } = await supabaseAdmin
    .from("documents")
    .upsert(payload as never, { onConflict: "kind,source_id" })
    .select("id")
    .single();
  if (error) throw error;
  const documentId = (data as { id: string }).id;

  // Tags
  await upsertTags(documentId, tags);

  // Chunks + embeddings
  const chunks = chunkMarkdown(p.bodyMd);
  if (chunks.length) {
    const vectors = await embedMany(chunks.map((c) => c.content));
    await supabaseAdmin.from("chunks").delete().eq("document_id", documentId);
    const rows = chunks.map((c, i) => ({
      document_id: documentId,
      ord: c.ord,
      content: c.content,
      tokens: c.tokens,
      embedding: vectors[i] as unknown as string,
    }));
    const { error: insErr } = await supabaseAdmin.from("chunks").insert(rows as never);
    if (insErr) throw insErr;
  }

  return { kind: "post", sourceId: p.sourceId, action: "upserted", documentId };
}

export async function ingestMedia(m: ParsedMedia): Promise<IngestReport> {
  const prior = await existingHash("media", m.sourceId);
  if (prior && prior.content_hash === m.contentHash) {
    return { kind: "media", sourceId: m.sourceId, action: "skipped", documentId: prior.id };
  }
  const payload = {
    kind: "media" as const,
    source_id: m.sourceId,
    slug: m.slug,
    title: m.title,
    summary: m.caption,
    body_md: m.caption,
    html: null,
    url_github: m.htmlUrl,
    author: null,
    published_at: m.publishedAt,
    content_hash: m.contentHash,
    meta: m.meta as never,
  };
  const { data, error } = await supabaseAdmin
    .from("documents")
    .upsert(payload as never, { onConflict: "kind,source_id" })
    .select("id")
    .single();
  if (error) throw error;
  return { kind: "media", sourceId: m.sourceId, action: "upserted", documentId: (data as { id: string }).id };
}

export async function ingestTweet(t: ParsedTweet): Promise<IngestReport> {
  const prior = await existingHash("tweet", t.sourceId);
  if (prior && prior.content_hash === t.contentHash) {
    return { kind: "tweet", sourceId: t.sourceId, action: "skipped", documentId: prior.id };
  }
  const payload = {
    kind: "tweet" as const,
    source_id: t.sourceId,
    slug: null,
    title: t.title,
    summary: t.body.slice(0, 200),
    body_md: t.body,
    html: null,
    url_github: t.htmlUrl,
    author: t.author,
    published_at: t.publishedAt,
    content_hash: t.contentHash,
    meta: { labels: t.labels, state: t.state } as never,
  };
  const { data, error } = await supabaseAdmin
    .from("documents")
    .upsert(payload as never, { onConflict: "kind,source_id" })
    .select("id")
    .single();
  if (error) throw error;
  const documentId = (data as { id: string }).id;

  // Tweets get labels-as-tags. No body chunking (tweets are short).
  if (t.labels.length) await upsertTags(documentId, t.labels.map((l) => l.toLowerCase()));

  return { kind: "tweet", sourceId: t.sourceId, action: "upserted", documentId };
}

export async function deleteByKindSource(kind: "post" | "media" | "tweet", sourceId: string): Promise<IngestReport> {
  const { error } = await supabaseAdmin
    .from("documents")
    .delete()
    .eq("kind", kind)
    .eq("source_id", sourceId);
  if (error) throw error;
  return { kind, sourceId, action: "deleted" };
}

/**
 * Remove documents that no longer exist upstream. Pass a Set of `sourceId`
 * values still present in GitHub for a given kind.
 */
export async function reapOrphans(kind: "post" | "media" | "tweet", keepSourceIds: Set<string>): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("documents")
    .select("id, source_id")
    .eq("kind", kind);
  if (error) throw error;
  const stale = (data ?? []).filter((r) => !keepSourceIds.has((r as { source_id: string }).source_id));
  if (!stale.length) return 0;
  const ids = stale.map((r) => (r as { id: string }).id);
  const { error: delErr } = await supabaseAdmin.from("documents").delete().in("id", ids);
  if (delErr) throw delErr;
  return ids.length;
}