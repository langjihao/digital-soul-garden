/**
 * RAG retriever: embeds the user query and runs hybrid_search,
 * joins documents, and returns a deduped, ranked context bundle
 * suitable for prompt injection + UI citations.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedOne } from "@/lib/ingest/embed.server";

export interface RagSource {
  n: number; // 1-based citation index
  documentId: string;
  kind: "post" | "tweet" | "media";
  slug: string | null;
  title: string | null;
  summary: string | null;
  url: string; // in-app link if possible, else GitHub
  publishedAt: string | null;
}

export interface RagChunk {
  n: number; // matches the source index
  content: string;
}

export interface RagBundle {
  sources: RagSource[];
  chunks: RagChunk[];
}

function inAppUrl(kind: string, slug: string | null, urlGithub: string): string {
  if (kind === "post" && slug) return `/posts/${slug}`;
  if (kind === "tweet") return `/tweets`;
  if (kind === "media") return `/media`;
  return urlGithub;
}

export async function retrieve(query: string, topK = 6): Promise<RagBundle> {
  const q = query.trim();
  if (!q) return { sources: [], chunks: [] };

  let embedding: number[];
  try {
    embedding = await embedOne(q);
  } catch (err) {
    console.warn("[rag] embed failed:", err);
    return { sources: [], chunks: [] };
  }

  const rpc = supabaseAdmin.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{
    data: Array<{ chunk_id: string; document_id: string; content: string; score: number }> | null;
    error: { message: string } | null;
  }>;

  const { data: rows, error } = await rpc("hybrid_search", {
    query_text: q,
    query_embedding: embedding as unknown as string,
    match_count: topK,
  });
  if (error || !rows?.length) {
    if (error) console.warn("[rag] hybrid_search failed:", error.message);
    return { sources: [], chunks: [] };
  }

  const docIds = Array.from(new Set(rows.map((r) => r.document_id)));
  const { data: docs } = await supabaseAdmin
    .from("documents")
    .select("id, kind, slug, title, summary, url_github, published_at")
    .in("id", docIds);
  const docMap = new Map(
    (docs ?? []).map((d) => [
      (d as { id: string }).id,
      d as {
        id: string;
        kind: "post" | "tweet" | "media";
        slug: string | null;
        title: string | null;
        summary: string | null;
        url_github: string;
        published_at: string | null;
      },
    ]),
  );

  // Assign citation numbers per unique document, but keep all top chunks.
  const docNum = new Map<string, number>();
  const sources: RagSource[] = [];
  const chunks: RagChunk[] = [];

  for (const row of rows) {
    let n = docNum.get(row.document_id);
    if (!n) {
      const doc = docMap.get(row.document_id);
      if (!doc) continue;
      n = sources.length + 1;
      docNum.set(row.document_id, n);
      sources.push({
        n,
        documentId: doc.id,
        kind: doc.kind,
        slug: doc.slug,
        title: doc.title,
        summary: doc.summary,
        url: inAppUrl(doc.kind, doc.slug, doc.url_github),
        publishedAt: doc.published_at,
      });
    }
    chunks.push({ n, content: row.content });
  }

  return { sources, chunks };
}

export function buildContextBlock(bundle: RagBundle): string {
  if (!bundle.chunks.length) return "";
  const lines: string[] = ["# 参考资料 / Retrieved Context"];
  for (const c of bundle.chunks) {
    const src = bundle.sources.find((s) => s.n === c.n);
    const title = src?.title ?? "(untitled)";
    lines.push(`\n[${c.n}] ${title}\n${c.content.trim()}`);
  }
  return lines.join("\n");
}