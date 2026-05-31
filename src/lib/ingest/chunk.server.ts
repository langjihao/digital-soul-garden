/**
 * Simple paragraph-based chunker with character target + overlap.
 * Avoids token-level deps; ~4 chars ≈ 1 token for English/Chinese mix.
 */

const TARGET_CHARS = 1800; // ~450 tokens
const OVERLAP_CHARS = 200;

export interface Chunk {
  ord: number;
  content: string;
  tokens: number;
}

export function chunkMarkdown(md: string): Chunk[] {
  const clean = md.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];
  // Split on blank lines (paragraphs) first.
  const paragraphs = clean.split(/\n{2,}/g).map((p) => p.trim()).filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > TARGET_CHARS && current) {
      chunks.push(current);
      // overlap: keep tail of previous chunk
      const tail = current.slice(-OVERLAP_CHARS);
      current = tail + "\n\n" + p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current) chunks.push(current);

  // Hard split any oversize chunk (e.g. one giant paragraph).
  const out: Chunk[] = [];
  let ord = 0;
  for (const c of chunks) {
    if (c.length <= TARGET_CHARS * 1.5) {
      out.push({ ord: ord++, content: c, tokens: Math.ceil(c.length / 4) });
    } else {
      for (let i = 0; i < c.length; i += TARGET_CHARS - OVERLAP_CHARS) {
        const slice = c.slice(i, i + TARGET_CHARS);
        out.push({ ord: ord++, content: slice, tokens: Math.ceil(slice.length / 4) });
      }
    }
  }
  return out;
}