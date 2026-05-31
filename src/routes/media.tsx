import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/site/PageTransition";
import { MediaCard } from "@/components/site/MediaCard";
import { mockMedia, type MockMedia } from "@/lib/mock-data";
import { useT } from "@/lib/i18n/provider";
import { listMediaFn } from "@/lib/api/documents.functions";

export const Route = createFileRoute("/media")({
  loader: async () => {
    const { items } = await listMediaFn();
    return { media: items.length ? items : mockMedia };
  },
  head: () => ({
    meta: [
      { title: "媒体 · ~/garden" },
      { name: "description", content: "照片签到与短语音笔记，其说明与文章一同被索引。" },
      { property: "og:title", content: "媒体 · ~/garden" },
      { property: "og:description", content: "照片签到与短语音笔记，其说明与文章一同被索引。" },
    ],
  }),
  component: MediaPage,
});

function MediaPage() {
  const t = useT();
  const { media } = Route.useLoaderData();
  return (
    <PageTransition>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{t.media.cmd}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{t.media.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t.media.desc}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(media as MockMedia[]).map((m, i) => (
            <MediaCard key={m.id} item={m} index={i} />
          ))}
        </div>
      </section>
    </PageTransition>
  );
}