import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/site/PageTransition";
import { PostCard } from "@/components/site/PostCard";
import { mockPosts, type MockPost } from "@/lib/mock-data";
import { useT } from "@/lib/i18n/provider";
import { listPostsFn } from "@/lib/api/documents.functions";

export const Route = createFileRoute("/posts")({
  loader: async () => {
    const { items } = await listPostsFn();
    return { posts: items.length ? items : mockPosts };
  },
  head: () => ({
    meta: [
      { title: "文章 · ~/garden" },
      { name: "description", content: "关于 RAG、混合检索、Postgres 与轻量系统设计的长文。" },
      { property: "og:title", content: "文章 · ~/garden" },
      { property: "og:description", content: "关于 RAG、混合检索、Postgres 与轻量系统设计的长文。" },
    ],
  }),
  component: PostsPage,
});

function PostsPage() {
  const t = useT();
  const { posts } = Route.useLoaderData();
  return (
    <PageTransition>
      <section className="mx-auto max-w-5xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{t.posts.cmd}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{t.posts.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {t.posts.desc}
          <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">{t.posts.descKbd}</kbd>
          {t.posts.descTail}
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {(posts as MockPost[]).map((p, i) => (
            <PostCard key={p.slug} post={p} index={i} />
          ))}
        </div>
      </section>
    </PageTransition>
  );
}