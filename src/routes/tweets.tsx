import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/site/PageTransition";
import { TweetItem } from "@/components/site/TweetItem";
import { mockTweets, type MockTweet } from "@/lib/mock-data";
import { useT } from "@/lib/i18n/provider";
import { listTweetsFn } from "@/lib/api/documents.functions";

export const Route = createFileRoute("/tweets")({
  loader: async () => {
    const { items } = await listTweetsFn();
    return { tweets: items.length ? items : mockTweets };
  },
  head: () => ({
    meta: [
      { title: "碎念 · ~/garden" },
      { name: "description", content: "以打了标签的 GitHub Issue 形式存放的短想法，评论与反应均在 GitHub 上。" },
      { property: "og:title", content: "碎念 · ~/garden" },
      { property: "og:description", content: "以打了标签的 GitHub Issue 形式存放的短想法，评论与反应均在 GitHub 上。" },
    ],
  }),
  component: TweetsPage,
});

function TweetsPage() {
  const t = useT();
  const { tweets } = Route.useLoaderData();
  return (
    <PageTransition>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{t.tweets.cmd}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{t.tweets.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.tweets.desc1}
          <span className="font-mono text-primary">{t.tweets.label}</span>
          {t.tweets.desc2}
        </p>
        <ul className="mt-8 space-y-5">
          {(tweets as MockTweet[]).map((t, i) => (
            <TweetItem key={t.id} tweet={t} index={i} />
          ))}
        </ul>
      </section>
    </PageTransition>
  );
}