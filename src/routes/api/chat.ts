/**
 * Streaming chat with local RAG.
 *
 * Pipeline: hybrid_search retrieval → context injection →
 * Lovable AI Gateway (google/gemini-3-flash-preview) streaming →
 * citations returned as message metadata.
 */
import { createFileRoute } from "@tanstack/react-router";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";
import { buildContextBlock, retrieve, type RagSource } from "@/lib/rag/retrieve.server";

function lastUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== "user") continue;
    return m.parts
      .map((p) => (p.type === "text" ? p.text : ""))
      .join(" ")
      .trim();
  }
  return "";
}

function systemPrompt(contextBlock: string, hasContext: boolean): string {
  const base = [
    "你是这座数字花园的 **Digital Twin**：作者本人语气的 RAG 助手。",
    "默认使用中文回答；用户用英文提问时再切换为英文。",
    "回答必须基于下方「参考资料」。引用时在句末标注 `[n]`，n 对应资料编号。",
    "找不到相关资料就直说不知道，不要编造。回答简洁，使用 Markdown。",
  ].join("\n");
  if (!hasContext) {
    return (
      base +
      "\n\n（本轮没有检索到相关资料，可以坦白告诉用户花园里暂时没有相关内容。）"
    );
  }
  return `${base}\n\n${contextBlock}`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.LOVABLE_API_KEY;
        if (!apiKey) {
          return new Response("LOVABLE_API_KEY not configured", { status: 500 });
        }

        let body: { messages?: UIMessage[] };
        try {
          body = (await request.json()) as { messages?: UIMessage[] };
        } catch {
          return new Response("invalid JSON", { status: 400 });
        }
        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return new Response("messages required", { status: 400 });
        }

        const query = lastUserText(body.messages);
        const bundle = query
          ? await retrieve(query, 6)
          : { sources: [] as RagSource[], chunks: [] };
        const ctx = buildContextBlock(bundle);

        const initialRunId = getLovableAiGatewayRunId(request);
        const gateway = createLovableAiGatewayProvider(apiKey, initialRunId);
        const model = gateway("google/gemini-3-flash-preview");

        const modelMessages = await convertToModelMessages(body.messages);
        const result = streamText({
          model,
          system: systemPrompt(ctx, bundle.sources.length > 0),
          messages: modelMessages,
        });

        return result.toUIMessageStreamResponse({
          originalMessages: body.messages,
          messageMetadata: ({ part }) => {
            // Attach citations once when the assistant message starts so the
            // client can render them alongside the streamed text.
            if (part.type === "start") {
              return { sources: bundle.sources };
            }
            return undefined;
          },
        });
      },
    },
  },
});