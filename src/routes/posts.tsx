import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/site/PageTransition";
import { PostCard } from "@/components/site/PostCard";
import { mockPosts } from "@/lib/mock-data";

export const Route = createFileRoute("/posts")({
  head: () => ({
    meta: [
      { title: "Posts · ~/garden" },
      {
        name: "description",
        content:
          "Long-form writing on RAG, hybrid search, Postgres, and shipping small systems that punch above their weight.",
      },
      { property: "og:title", content: "Posts · ~/garden" },
      {
        property: "og:description",
        content:
          "Long-form writing on RAG, hybrid search, Postgres, and shipping small systems that punch above their weight.",
      },
    ],
  }),
  component: PostsPage,
});

function PostsPage() {
  return (
    <PageTransition>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">$ ls posts/</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Posts</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Written in MDX, pushed to GitHub, summarised and indexed by CI. The hybrid
          search behind <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">⌘K</kbd>{" "}
          covers everything below.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {mockPosts.map((p, i) => (
            <PostCard key={p.slug} post={p} index={i} />
          ))}
        </div>
      </section>
    </PageTransition>
  );
}