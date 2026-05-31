/**
 * Webhook entry called by the content repo's GitHub Action.
 *
 * Auth: HMAC-SHA256 over the raw body, supplied as
 *   x-ingest-signature: sha256=<hex>
 * Secret lives in INGEST_WEBHOOK_SECRET (server env).
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { runFullResync, runIngestIssue, runIngestPush } from "@/lib/ingest/run.server";

const PayloadSchema = z.object({
  event: z.string().min(1).max(64),
  repo: z.string().min(3).max(120),
  ref: z.string().max(120).nullable().optional(),
  action: z.string().max(64).nullable().optional(),
  issue_number: z.number().int().positive().nullable().optional(),
  before: z.string().max(64).nullable().optional(),
  after: z.string().max(64).nullable().optional(),
  full_resync: z.boolean().optional(),
});

function verifySig(secret: string, signatureHeader: string | null, body: string): boolean {
  if (!signatureHeader) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;
  if (provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export const Route = createFileRoute("/api/public/ingest")({
  server: {
    handlers: {
      GET: async () => Response.json({ ok: true, hint: "POST signed payload here" }),

      POST: async ({ request }) => {
        const secret = process.env.INGEST_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("INGEST_WEBHOOK_SECRET not configured", { status: 500 });
        }
        const raw = await request.text();
        if (raw.length > 32 * 1024) {
          return new Response("payload too large", { status: 413 });
        }
        if (!verifySig(secret, request.headers.get("x-ingest-signature"), raw)) {
          return new Response("invalid signature", { status: 401 });
        }

        let payload: z.infer<typeof PayloadSchema>;
        try {
          payload = PayloadSchema.parse(JSON.parse(raw));
        } catch (err) {
          return new Response(`bad payload: ${(err as Error).message}`, { status: 400 });
        }

        const expectedRepo = process.env.GITHUB_CONTENT_REPO;
        if (expectedRepo && payload.repo.toLowerCase() !== expectedRepo.toLowerCase()) {
          return new Response(`repo mismatch: ${payload.repo}`, { status: 403 });
        }

        try {
          let reports;
          if (payload.full_resync || payload.event === "workflow_dispatch") {
            reports = await runFullResync();
          } else if (payload.event === "issues" && payload.issue_number) {
            reports = await runIngestIssue(payload.issue_number, payload.action ?? "edited");
          } else if (payload.event === "push") {
            reports = await runIngestPush();
          } else {
            reports = [];
          }
          return Response.json({ ok: true, count: reports.length, reports });
        } catch (err) {
          console.error("[ingest] failed:", err);
          return new Response(`ingest failed: ${(err as Error).message}`, { status: 500 });
        }
      },
    },
  },
});