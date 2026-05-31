/**
 * Storage layer — backend-agnostic contracts.
 *
 * Every server function in the app talks to these interfaces, NOT to a
 * concrete backend SDK. To migrate to self-hosted Postgres + MinIO, swap
 * the adapter behind `createStorage()` — business code does not change.
 */

export type DocKind = "post" | "tweet" | "media";

export interface DocumentRecord {
  id: string;
  kind: DocKind;
  sourceId: string;
  slug: string | null;
  title: string | null;
  summary: string | null;
  bodyMd: string | null;
  html: string | null;
  urlGithub: string;
  author: string | null;
  publishedAt: string | null;
  updatedAt: string;
  createdAt: string;
  meta: Record<string, unknown>;
  contentHash: string;
}

export interface ChunkInput {
  documentId: string;
  ord: number;
  content: string;
  tokens?: number | null;
  /** 1536-dim embedding (pgvector HNSW limit). */
  embedding: number[];
}

export interface HybridHit {
  chunkId: string;
  documentId: string;
  content: string;
  score: number;
  document?: Pick<DocumentRecord, "id" | "kind" | "slug" | "title" | "summary" | "urlGithub">;
}

export interface ListDocumentsOptions {
  kind?: DocKind;
  limit?: number;
  cursor?: string | null;
  tag?: string;
}

export interface DocumentRepo {
  list(opts?: ListDocumentsOptions): Promise<{ items: DocumentRecord[]; nextCursor: string | null }>;
  getBySlug(slug: string): Promise<DocumentRecord | null>;
  getById(id: string): Promise<DocumentRecord | null>;
  upsert(doc: Omit<DocumentRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<DocumentRecord>;
  delete(id: string): Promise<void>;
}

export interface VectorRepo {
  replaceChunksForDocument(documentId: string, chunks: ChunkInput[]): Promise<void>;
  hybridSearch(args: {
    query: string;
    embedding: number[];
    k?: number;
    kind?: DocKind;
    /** weight of vector vs BM25; 0..1, default 0.5 */
    alpha?: number;
  }): Promise<HybridHit[]>;
}

export interface SignedUrl {
  url: string;
  expiresIn: number;
  method?: "GET" | "PUT";
}

export interface BlobStore {
  getSignedUploadUrl(key: string, contentType?: string): Promise<SignedUrl>;
  getSignedDownloadUrl(key: string): Promise<SignedUrl>;
  getPublicUrl(key: string): string;
  delete(key: string): Promise<void>;
}

export interface CommentRecord {
  id: string;
  documentId: string;
  parentId: string | null;
  authorId: string | null;
  authorName: string;
  body: string;
  createdAt: string;
}

export interface AnnotationRecord {
  id: string;
  documentId: string;
  paragraphId: string;
  quote: string;
  body: string;
  authorId: string | null;
  authorName: string;
  createdAt: string;
}

export interface CommentRepo {
  listForDocument(documentId: string): Promise<CommentRecord[]>;
  create(input: Omit<CommentRecord, "id" | "createdAt">): Promise<CommentRecord>;
  delete(id: string, authorId: string): Promise<void>;
}

export interface AnnotationRepo {
  listForDocument(documentId: string): Promise<AnnotationRecord[]>;
  create(input: Omit<AnnotationRecord, "id" | "createdAt">): Promise<AnnotationRecord>;
  delete(id: string, authorId: string): Promise<void>;
}

export interface AuthUser {
  id: string;
  email: string | null;
  name?: string | null;
}

export interface AuthProvider {
  getCurrentUser(accessToken: string | null): Promise<AuthUser | null>;
}

export interface Storage {
  driver: "supabase" | "selfhost";
  documents: DocumentRepo;
  vectors: VectorRepo;
  blobs: BlobStore;
  comments: CommentRepo;
  annotations: AnnotationRepo;
  auth: AuthProvider;
}

export class NotImplementedError extends Error {
  constructor(method: string) {
    super(`Storage method not implemented: ${method}`);
    this.name = "NotImplementedError";
  }
}