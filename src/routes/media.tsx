import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/site/PageTransition";
import { MediaCard } from "@/components/site/MediaCard";
import { mockMedia } from "@/lib/mock-data";

export const Route = createFileRoute("/media")({
  head: () => ({
    meta: [
      { title: "Media · ~/garden" },
      {
        name: "description",
        content: "Photo check-ins and short voice notes. Captions are indexed alongside posts.",
      },
      { property: "og:title", content: "Media · ~/garden" },
      {
        property: "og:description",
        content: "Photo check-ins and short voice notes. Captions are indexed alongside posts.",
      },
    ],
  }),
  component: MediaPage,
});

function MediaPage() {
  return (
    <PageTransition>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">$ open media/</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Media</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Photo check-ins and short voice notes. Each item&apos;s alt text and caption are
          indexed alongside the posts, so they show up in hybrid search.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockMedia.map((m, i) => (
            <MediaCard key={m.id} item={m} index={i} />
          ))}
        </div>
      </section>
    </PageTransition>
  );
}