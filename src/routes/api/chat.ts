/**
 * Streaming chat → Dify via OpenAI-compatible endpoint, using AI SDK.
 *
 * Dify exposes `{base}/chat/completions` for Chat/Agent/Chatflow apps,
 * authenticated by the same `app-xxx` key as a Bearer token. This lets us
 * skip hand-rolled SSE parsing and use `streamText` + `toUIMessageStreamResponse`.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.DIFY_API_KEY;
        const base = (process.env.DIFY_API_URL || "https://api.dify.ai/v1").replace(/\/$/, "");
        if (!apiKey) return new Response("DIFY_API_KEY not configured", { status: 500 });

        let body: { messages?: UIMessage[] };
        try {
          body = (await request.json()) as { messages?: UIMessage[] };
        } catch {
          return new Response("invalid JSON", { status: 400 });
        }
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }

        const dify = createOpenAICompatible({
          name: "dify",
          baseURL: base,
          headers: { Authorization: `Bearer ${apiKey}` },
        });

        // Dify ignores the model id for OpenAI-compat chat apps — it uses
        // whatever the app is configured with — but the field is required.
        const result = streamText({
          model: dify("dify"),
          messages: convertToModelMessages(body.messages),
        });

        return result.toUIMessageStreamResponse({ originalMessages: body.messages });
      },
    },
  },
});
