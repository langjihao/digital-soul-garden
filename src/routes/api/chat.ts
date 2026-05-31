/**
 * Streaming chat proxy → Dify (https://api.dify.ai/v1/chat-messages).
 *
 * Request body: { query: string, conversationId?: string, user?: string }
 * Response: text/event-stream forwarding Dify's SSE frames unchanged, plus a
 * final `event: meta` line containing { conversationId } once Dify reports it.
 */
import { createFileRoute } from "@tanstack/react-router";

interface ChatRequest {
  query?: string;
  conversationId?: string | null;
  user?: string;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.DIFY_API_KEY;
        const base = (process.env.DIFY_API_URL || "https://api.dify.ai/v1").replace(/\/$/, "");
        if (!apiKey) return new Response("DIFY_API_KEY not configured", { status: 500 });

        let body: ChatRequest;
        try {
          body = (await request.json()) as ChatRequest;
        } catch {
          return new Response("invalid JSON", { status: 400 });
        }
        const query = (body.query ?? "").toString().trim();
        if (!query || query.length > 4000) {
          return new Response("query is required (max 4000 chars)", { status: 400 });
        }

        const upstream = await fetch(`${base}/chat-messages`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            inputs: {},
            query,
            response_mode: "streaming",
            user: body.user || "anonymous",
            conversation_id: body.conversationId || "",
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const txt = await upstream.text().catch(() => "");
          return new Response(`dify error [${upstream.status}]: ${txt.slice(0, 300)}`, {
            status: 502,
          });
        }

        // Forward SSE as-is.
        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
          },
        });
      },
    },
  },
});