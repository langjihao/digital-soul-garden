import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/site/PageTransition";
import { TweetItem } from "@/components/site/TweetItem";
import { mockTweets } from "@/lib/mock-data";

export const Route = createFileRoute("/tweets")({
  head: () => ({
    meta: [
      { title: "Tweets · ~/garden" },
      {
        name: "description",
        content:
          "Short notes stored as labelled GitHub Issues. Comments and reactions live on GitHub.",
      },
      { property: "og:title", content: "Tweets · ~/garden" },
      {
        property: "og:description",
        content:
          "Short notes stored as labelled GitHub Issues. Comments and reactions live on GitHub.",
      },
    ],
  }),
  component: TweetsPage,
});

function TweetsPage() {
  return (
    <PageTransition>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">
          $ git log --label tweet
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">Tweets</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Each entry is a GitHub Issue labelled <span className="font-mono text-primary">tweet</span>.
          Sign in with GitHub to comment or react.
        </p>
        <ul className="mt-8 space-y-5">
          {mockTweets.map((t, i) => (
            <TweetItem key={t.id} tweet={t} index={i} />
          ))}
        </ul>
      </section>
    </PageTransition>
  );
}