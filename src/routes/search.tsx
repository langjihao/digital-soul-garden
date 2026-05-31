import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { PageTransition } from "@/components/site/PageTransition";
import { hybridSearch, type SearchHit } from "@/lib/search/hybrid.functions";

export const Route = createFileRoute("/search")({
  head: () => ({
    meta: [
      { title: "搜索 · ~/garden" },
      { name: "description", content: "BM25 + 向量混合检索，覆盖花园里的全部内容。" },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const mut = useMutation({
    mutationFn: (query: string) => hybridSearch({ data: { query, limit: 12 } }),
  });

  return (
    <PageTransition>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">$ ./hybrid_search</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">混合检索</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          BM25 + 向量（pgvector，<code className="font-mono">text-embedding-3-small / 1536d</code>），通过 RRF 融合。
        </p>

        <form
          className="mt-6 flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = q.trim();
            if (trimmed) mut.mutate(trimmed);
          }}
        >
          <Search className="size-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="试试：pgvector、RAG、TanStack…"
            className="w-full bg-transparent font-mono text-sm outline-none"
          />
          {mut.isPending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
        </form>

        {mut.isError && (
          <p className="mt-4 font-mono text-xs text-destructive">
            搜索失败：{(mut.error as Error).message}
          </p>
        )}

        <ul className="mt-8 space-y-4">
          {(mut.data?.hits ?? []).map((hit) => (
            <HitRow key={hit.chunkId} hit={hit} />
          ))}
          {mut.isSuccess && !mut.data.hits.length && (
            <li className="font-mono text-xs text-muted-foreground">无结果。内容仓库可能尚未索引。</li>
          )}
        </ul>
      </section>
    </PageTransition>
  );
}

function HitRow({ hit }: { hit: SearchHit }) {
  const doc = hit.document;
  const href = doc?.kind === "post" && doc.slug ? `/posts/${doc.slug}` : doc?.urlGithub ?? "#";
  return (
    <li className="rounded-md border border-border bg-card/50 p-4">
      <div className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted-foreground">
        <span>{doc?.kind ?? "?"} · score {hit.score.toFixed(4)}</span>
        {doc?.publishedAt && <span>{doc.publishedAt.slice(0, 10)}</span>}
      </div>
      <a href={href} className="mt-1 block text-base font-medium text-foreground hover:text-primary">
        {doc?.title ?? "(untitled)"}
      </a>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{hit.content}</p>
    </li>
  );
}