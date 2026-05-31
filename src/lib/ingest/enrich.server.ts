/**
 * AI enrichment: auto-summary + tag suggestion via Lovable AI Gateway.
 * Uses chat-completions JSON mode with google/gemini-2.5-flash for speed.
 */

const ENDPOINT = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

interface EnrichResult {
  summary: string;
  summary_en: string;
  tags: string[];
}

const SYSTEM = `You are an editorial assistant for a bilingual (zh/en) personal digital garden.
Given a markdown post, produce:
- "summary": a single-sentence Chinese summary (≤ 60 chars), plain text, no quotes
- "summary_en": the English equivalent (≤ 120 chars)
- "tags": 3 to 5 lowercase, hyphenated topical tags (e.g. "rag", "postgres", "tanstack")
Return ONLY valid JSON matching: { "summary": string, "summary_en": string, "tags": string[] }`;

export async function enrichPost(args: {
  title: string;
  body: string;
  existingTags?: string[];
}): Promise<EnrichResult> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const userMsg = [
    `Title: ${args.title}`,
    args.existingTags?.length ? `Author tags (keep if good): ${args.existingTags.join(", ")}` : "",
    "---",
    args.body.slice(0, 6000),
  ]
    .filter(Boolean)
    .join("\n");

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "raw-fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userMsg },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`enrich failed [${res.status}]: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const raw = json.choices[0]?.message?.content ?? "{}";
  try {
    const parsed = JSON.parse(raw) as Partial<EnrichResult>;
    return {
      summary: (parsed.summary ?? "").toString().trim(),
      summary_en: (parsed.summary_en ?? "").toString().trim(),
      tags: Array.isArray(parsed.tags)
        ? parsed.tags.map((t) => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 5)
        : [],
    };
  } catch {
    return { summary: "", summary_en: "", tags: args.existingTags ?? [] };
  }
}