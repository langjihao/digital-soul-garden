import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { PageTransition } from "@/components/site/PageTransition";
import { AnnotatedArticle } from "@/components/site/AnnotatedArticle";
import { CommentSection } from "@/components/site/CommentSection";
import { mockPosts, pick, formatDate, getPostBody } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n/provider";
import { getPostBySlugFn } from "@/lib/api/documents.functions";

export const Route = createFileRoute("/posts/$slug")({
  loader: async ({ params }) => {
    const { post } = await getPostBySlugFn({ data: { slug: params.slug } });
    const fallback = mockPosts.find((p) => p.slug === params.slug);
    const resolved = post ?? fallback;
    if (!resolved) throw notFound();
    return { post: resolved };
  },
  head: ({ loaderData }) => {
    const title = loaderData?.post ? pick(loaderData.post.title, "zh") : "文章";
    const desc = loaderData?.post ? pick(loaderData.post.summary, "zh") : "";
    return {
      meta: [
        { title: `${title} · ~/garden` },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "article" },
      ],
    };
  },
  component: PostDetail,
  notFoundComponent: () => (
    <div className="mx-auto max-w-3xl px-4 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-semibold">找不到这篇文章</h1>
      <Link to="/posts" className="mt-6 inline-block font-mono text-sm text-primary hover:underline">
        ← 返回文章列表
      </Link>
    </div>
  ),
});

function PostDetail() {
  const { post } = Route.useLoaderData();
  const { locale } = useI18n();
  const paragraphs = getPostBody(post, locale);

  return (
    <PageTransition>
      <article className="mx-auto max-w-6xl px-4 py-12">
        <Link
          to="/posts"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.25em] text-muted-foreground transition hover:text-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {locale === "zh" ? "返回文章列表" : "back to posts"}
        </Link>

        <header className="mt-6 max-w-3xl">
          <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>{formatDate(post.publishedAt, locale)}</span>
            <span>·</span>
            <span>{post.readingMinutes} {locale === "zh" ? "分钟阅读" : "min read"}</span>
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
            {pick(post.title, locale)}
          </h1>
          <p className="mt-3 text-base text-muted-foreground">{pick(post.summary, locale)}</p>
          <div className="mt-4 flex flex-wrap gap-1.5">
            {post.tags.map((tag: string) => (
              <span
                key={tag}
                className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                #{tag}
              </span>
            ))}
          </div>
        </header>

        <div className="mt-10">
          <AnnotatedArticle paragraphs={paragraphs} documentId={post.slug} />
        </div>

        <div className="mx-auto max-w-3xl">
          <CommentSection threadKey={post.slug} />
        </div>
      </article>
    </PageTransition>
  );
}