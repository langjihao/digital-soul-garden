/**
 * Supabase adapter — implements the storage contracts using the
 * service-role client. Server-only (file extension enforces this).
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  AnnotationRecord,
  AnnotationRepo,
  AuthProvider,
  AuthUser,
  BlobStore,
  ChunkInput,
  CommentRecord,
  CommentRepo,
  DocumentRecord,
  DocumentRepo,
  HybridHit,
  ListDocumentsOptions,
  SignedUrl,
  Storage,
  VectorRepo,
} from "../types";
import { NotImplementedError } from "../types";

/* ------------------------------------------------------------------ */
/* Row mappers                                                         */
/* ------------------------------------------------------------------ */

type DocRow = {
  id: string;
  kind: "post" | "tweet" | "media";
  source_id: string;
  slug: string | null;
  title: string | null;
  summary: string | null;
  body_md: string | null;
  html: string | null;
  url_github: string;
  author: string | null;
  published_at: string | null;
  updated_at: string;
  created_at: string;
  meta: Record<string, unknown> | null;
  content_hash: string;
};

function mapDoc(row: DocRow): DocumentRecord {
  return {
    id: row.id,
    kind: row.kind,
    sourceId: row.source_id,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    bodyMd: row.body_md,
    html: row.html,
    urlGithub: row.url_github,
    author: row.author,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    createdAt: row.created_at,
    meta: row.meta ?? {},
    contentHash: row.content_hash,
  };
}

/* ------------------------------------------------------------------ */
/* DocumentRepo                                                        */
/* ------------------------------------------------------------------ */

const documents: DocumentRepo = {
  async list(opts: ListDocumentsOptions = {}) {
    const limit = Math.min(opts.limit ?? 20, 100);
    let q = supabaseAdmin
      .from("documents")
      .select("*")
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(limit + 1);
    if (opts.kind) q = q.eq("kind", opts.kind);
    if (opts.cursor) q = q.lt("published_at", opts.cursor);
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as unknown as DocRow[];
    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(mapDoc);
    const nextCursor = hasMore ? items[items.length - 1]?.publishedAt ?? null : null;
    return { items, nextCursor };
  },

  async getBySlug(slug) {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDoc(data as unknown as DocRow) : null;
  },

  async getById(id) {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapDoc(data as unknown as DocRow) : null;
  },

  async upsert(doc) {
    const payload = {
      id: doc.id,
      kind: doc.kind,
      source_id: doc.sourceId,
      slug: doc.slug,
      title: doc.title,
      summary: doc.summary,
      body_md: doc.bodyMd,
      html: doc.html,
      url_github: doc.urlGithub,
      author: doc.author,
      published_at: doc.publishedAt,
      meta: doc.meta as never,
      content_hash: doc.contentHash,
    };
    const { data, error } = await supabaseAdmin
      .from("documents")
      .upsert(payload as never, { onConflict: "kind,source_id" })
      .select("*")
      .single();
    if (error) throw error;
    return mapDoc(data as unknown as DocRow);
  },

  async delete(id) {
    const { error } = await supabaseAdmin.from("documents").delete().eq("id", id);
    if (error) throw error;
  },
};

/* ------------------------------------------------------------------ */
/* VectorRepo                                                          */
/* ------------------------------------------------------------------ */

const vectors: VectorRepo = {
  async replaceChunksForDocument(documentId: string, chunks: ChunkInput[]) {
    const { error: delErr } = await supabaseAdmin
      .from("chunks")
      .delete()
      .eq("document_id", documentId);
    if (delErr) throw delErr;
    if (!chunks.length) return;
    const rows = chunks.map((c) => ({
      document_id: c.documentId,
      ord: c.ord,
      content: c.content,
      tokens: c.tokens ?? null,
      embedding: c.embedding as unknown as string, // pgvector accepts JSON-like
    }));
    const { error } = await supabaseAdmin.from("chunks").insert(rows);
    if (error) throw error;
  },

  async hybridSearch({ query, embedding, k = 10, kind, alpha = 0.5 }): Promise<HybridHit[]> {
    // Expects an RPC `hybrid_search` to be defined in a follow-up migration.
    // Until then we fall back to vector-only via direct SQL.
    const { data, error } = await (supabaseAdmin.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: HybridHit[] | null; error: { message: string } | null }>)("hybrid_search", {
      query_text: query,
      query_embedding: embedding as unknown as string,
      match_count: k,
      doc_kind: kind ?? null,
      vec_weight: alpha,
    });
    if (error) {
      console.warn("[storage] hybrid_search RPC missing, returning empty result:", error.message);
      return [];
    }
    return (data ?? []) as HybridHit[];
  },
};

/* ------------------------------------------------------------------ */
/* BlobStore (Supabase Storage)                                        */
/* ------------------------------------------------------------------ */

const BUCKET = "media";

const blobs: BlobStore = {
  async getSignedUploadUrl(key, _contentType): Promise<SignedUrl> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(key);
    if (error) throw error;
    return { url: data.signedUrl, expiresIn: 3600, method: "PUT" };
  },
  async getSignedDownloadUrl(key): Promise<SignedUrl> {
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(key, 3600);
    if (error) throw error;
    return { url: data.signedUrl, expiresIn: 3600, method: "GET" };
  },
  getPublicUrl(key) {
    return supabaseAdmin.storage.from(BUCKET).getPublicUrl(key).data.publicUrl;
  },
  async delete(key) {
    const { error } = await supabaseAdmin.storage.from(BUCKET).remove([key]);
    if (error) throw error;
  },
};

/* ------------------------------------------------------------------ */
/* Comments + Annotations — tables not yet provisioned, stubs throw   */
/* ------------------------------------------------------------------ */

const comments: CommentRepo = {
  async listForDocument(_documentId): Promise<CommentRecord[]> {
    return [];
  },
  async create(_input) {
    throw new NotImplementedError("comments.create (pending migration)");
  },
  async delete(_id, _authorId) {
    throw new NotImplementedError("comments.delete (pending migration)");
  },
};

const annotations: AnnotationRepo = {
  async listForDocument(_documentId): Promise<AnnotationRecord[]> {
    return [];
  },
  async create(_input) {
    throw new NotImplementedError("annotations.create (pending migration)");
  },
  async delete(_id, _authorId) {
    throw new NotImplementedError("annotations.delete (pending migration)");
  },
};

/* ------------------------------------------------------------------ */
/* AuthProvider                                                        */
/* ------------------------------------------------------------------ */

const auth: AuthProvider = {
  async getCurrentUser(accessToken): Promise<AuthUser | null> {
    if (!accessToken) return null;
    const { data, error } = await supabaseAdmin.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? null,
      name: (data.user.user_metadata?.name as string | undefined) ?? null,
    };
  },
};

/* ------------------------------------------------------------------ */

export const supabaseStorage: Storage = {
  driver: "supabase",
  documents,
  vectors,
  blobs,
  comments,
  annotations,
  auth,
};