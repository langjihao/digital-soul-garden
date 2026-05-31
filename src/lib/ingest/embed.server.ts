/**
 * Text embedding via Lovable AI Gateway (OpenAI-compatible /v1/embeddings).
 * Returns 1536-dim vectors using openai/text-embedding-3-small to match
 * the existing `chunks.embedding vector(1536)` column.
 */

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/embeddings";
const MODEL = "openai/text-embedding-3-small";
const DIMS = 1536;

export async function embedMany(texts: string[]): Promise<number[][]> {
  if (!texts.length) return [];
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  // OpenAI-compatible endpoint accepts string[] in `input`; cap batch size.
  const BATCH = 32;
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "raw-fetch",
      },
      body: JSON.stringify({ model: MODEL, input: slice, dimensions: DIMS }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`embed failed [${res.status}]: ${txt.slice(0, 200)}`);
    }
    const json = (await res.json()) as {
      data: Array<{ embedding: number[]; index: number }>;
    };
    // Preserve order via index.
    const sorted = [...json.data].sort((a, b) => a.index - b.index);
    for (const item of sorted) out.push(item.embedding);
  }
  return out;
}

export async function embedOne(text: string): Promise<number[]> {
  const [v] = await embedMany([text]);
  return v;
}