/**
 * Hybrid search server function — embeds the query and calls the
 * `hybrid_search` SQL function (BM25 + cosine via RRF).
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { embedOne } from "@/lib/ingest/embed.server";

const InputSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(30).optional(),
});

export interface SearchHit {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  document: {
    id: string;
    kind: "post" | "tweet" | "media";
    slug: string | null;
    title: string | null;
    summary: string | null;
    urlGithub: string;
    publishedAt: string | null;
  } | null;
}

export const hybridSearch = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }): Promise<{ hits: SearchHit[] }> => {
    const limit = data.limit ?? 10;

    let embedding: number[];
    try {
      embedding = await embedOne(data.query);
    } catch (err) {
      console.warn("[search] embedding failed, returning empty:", err);
      return { hits: [] };
    }

    const { data: rows, error } = await (
      supabaseAdmin.rpc as unknown as (
        fn: string,
        args: Record<string, unknown>,
      ) => Promise<{
        data: Array<{ chunk_id: string; document_id: string; content: string; score: number }> | null;
        error: { message: string } | null;
      }>
    ).call(supabaseAdmin, "hybrid_search", {
      query_text: data.query,
      query_embedding: embedding as unknown as string,
      match_count: limit,
    });
    if (error) {
      console.warn("[search] hybrid_search RPC failed:", error.message);
      return { hits: [] };
    }
    const hitRows = rows ?? [];
    if (!hitRows.length) return { hits: [] };

    // Hydrate documents
    const docIds = Array.from(new Set(hitRows.map((r) => r.document_id)));
    const { data: docs } = await supabaseAdmin
      .from("documents")
      .select("id, kind, slug, title, summary, url_github, published_at")
      .in("id", docIds);
    const byId = new Map(
      (docs ?? []).map((d) => [
        (d as { id: string }).id,
        {
          id: (d as { id: string }).id,
          kind: (d as { kind: "post" | "tweet" | "media" }).kind,
          slug: (d as { slug: string | null }).slug,
          title: (d as { title: string | null }).title,
          summary: (d as { summary: string | null }).summary,
          urlGithub: (d as { url_github: string }).url_github,
          publishedAt: (d as { published_at: string | null }).published_at,
        },
      ]),
    );

    return {
      hits: hitRows.map((r) => ({
        chunkId: r.chunk_id,
        documentId: r.document_id,
        content: r.content,
        score: r.score,
        document: byId.get(r.document_id) ?? null,
      })),
    };
  });