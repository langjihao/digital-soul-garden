import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles, Github } from "lucide-react";
import { PageTransition } from "@/components/site/PageTransition";
import { PostCard } from "@/components/site/PostCard";
import { TweetItem } from "@/components/site/TweetItem";
import { mockPosts, mockTweets } from "@/lib/mock-data";
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "~/garden — 数字花园" },
      {
        name: "description",
        content:
          "存放在 GitHub 私有仓库里的文章、碎念与媒体，统一索引、可被混合检索，并附带一个能与之对话的数字孪生。",
      },
      { property: "og:title", content: "~/garden — 数字花园" },
      {
        property: "og:description",
        content:
          "存放在 GitHub 私有仓库里的文章、碎念与媒体，统一索引、可被混合检索，并附带一个能与之对话的数字孪生。",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const t = useT();
  return (
    <PageTransition>
      <section className="mx-auto max-w-5xl px-4 pb-12 pt-16 sm:pt-24">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{t.home.whoami}</p>
        <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
          {t.home.h1Pre}
          <span className="font-mono text-primary">{t.home.h1Highlight}</span>
          {t.home.h1Post}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-muted-foreground">
          {t.home.intro}
          <kbd className="mx-1 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            {t.home.introKbd}
          </kbd>
          {t.home.introSearch}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/posts"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t.common.readPosts} <ArrowRight className="h-4 w-4" />
          </Link>
          <a
            href="#twin"
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/40"
          >
            <Sparkles className="h-4 w-4 text-primary" /> {t.common.askTwin}
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeader title={t.home.recentPosts} hint="/posts" to="/posts" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {mockPosts.slice(0, 4).map((p, i) => (
            <PostCard key={p.slug} post={p} index={i} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <SectionHeader title={t.home.latestTweets} hint="/tweets" to="/tweets" />
        <ul className="mt-6 space-y-4">
          {mockTweets.slice(0, 3).map((t, i) => (
            <TweetItem key={t.id} tweet={t} index={i} />
          ))}
        </ul>
      </section>

      <section
        id="twin"
        className="mx-auto my-16 max-w-5xl rounded-2xl border border-border bg-card/40 px-6 py-10 sm:px-10"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{t.home.twinCmd}</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">{t.home.twinTitle}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{t.home.twinDesc}</p>
          </div>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 self-start rounded-md border border-border px-3 py-2 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground"
          >
            <Github className="h-4 w-4" /> {t.common.sourceOnGithub}
          </a>
        </div>
      </section>
    </PageTransition>
  );
}

function SectionHeader({ title, hint, to }: { title: string; hint: string; to: string }) {
  const t = useT();
  return (
    <div className="flex items-end justify-between border-b border-border pb-3">
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <Link
        to={to}
        className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
      >
        {t.common.cd} {hint}
      </Link>
    </div>
  );
}
