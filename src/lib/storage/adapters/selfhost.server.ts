/**
 * Self-host adapter skeleton — Postgres + pgvector + MinIO (S3 API).
 *
 * NOT WIRED YET. Implement these methods when you stand up the docker-compose
 * stack in docs/self-host/. The shape mirrors `supabaseStorage` so swapping
 * is a 1-line change at the factory.
 *
 * Required runtime deps (install when you activate this adapter):
 *   bun add postgres @aws-sdk/client-s3 @aws-sdk/s3-request-presigner jsonwebtoken
 */
import type {
  AnnotationRepo,
  AuthProvider,
  BlobStore,
  CommentRepo,
  DocumentRepo,
  Storage,
  VectorRepo,
} from "../types";
import { NotImplementedError } from "../types";

function todo(method: string): never {
  throw new NotImplementedError(`selfhost.${method}`);
}

const documents: DocumentRepo = {
  list: () => todo("documents.list"),
  getBySlug: () => todo("documents.getBySlug"),
  getById: () => todo("documents.getById"),
  upsert: () => todo("documents.upsert"),
  delete: () => todo("documents.delete"),
};

const vectors: VectorRepo = {
  replaceChunksForDocument: () => todo("vectors.replaceChunksForDocument"),
  hybridSearch: () => todo("vectors.hybridSearch"),
};

const blobs: BlobStore = {
  getSignedUploadUrl: () => todo("blobs.getSignedUploadUrl"),
  getSignedDownloadUrl: () => todo("blobs.getSignedDownloadUrl"),
  getPublicUrl: (key: string) => {
    const base = process.env.MINIO_PUBLIC_BASE_URL ?? "";
    return `${base.replace(/\/$/, "")}/${key}`;
  },
  delete: () => todo("blobs.delete"),
};

const comments: CommentRepo = {
  listForDocument: () => todo("comments.listForDocument"),
  create: () => todo("comments.create"),
  delete: () => todo("comments.delete"),
};

const annotations: AnnotationRepo = {
  listForDocument: () => todo("annotations.listForDocument"),
  create: () => todo("annotations.create"),
  delete: () => todo("annotations.delete"),
};

const auth: AuthProvider = {
  getCurrentUser: () => todo("auth.getCurrentUser"),
};

export const selfhostStorage: Storage = {
  driver: "selfhost",
  documents,
  vectors,
  blobs,
  comments,
  annotations,
  auth,
};