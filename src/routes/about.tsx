import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/site/PageTransition";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About · ~/garden" },
      {
        name: "description",
        content:
          "About this digital garden — the architecture, the philosophy, and how the digital twin works.",
      },
      { property: "og:title", content: "About · ~/garden" },
      {
        property: "og:description",
        content:
          "About this digital garden — the architecture, the philosophy, and how the digital twin works.",
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <PageTransition>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">$ cat about.md</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">About</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            This garden is a deliberate counter-weight to platforms. Long writing,
            short notes, and media all live in a private GitHub repo. A CI pipeline
            diffs new content, summarises it with an LLM, embeds it, and pushes
            both the summary and the vectors into Postgres.
          </p>
          <p>
            The frontend is <span className="font-mono text-primary">TanStack Start</span>
            on Cloudflare Workers, reading from that Postgres layer. The{" "}
            <span className="font-mono text-primary">⌘K</span> palette runs a hybrid
            search (BM25 + cosine) against the same store. The floating chat is a
            RAG agent that pulls the top-k chunks before answering in my voice.
          </p>
          <p>
            Phase 1 (you are here) is the static shell with mock data. Phases 2-4
            wire in GitHub, the embedding pipeline, and the streaming AI chat.
          </p>
        </div>
      </section>
    </PageTransition>
  );
}