import { createFileRoute } from "@tanstack/react-router";
import { PageTransition } from "@/components/site/PageTransition";
import { useT } from "@/lib/i18n/provider";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "关于 · ~/garden" },
      { name: "description", content: "关于这座数字花园——架构、理念，以及数字孪生的工作原理。" },
      { property: "og:title", content: "关于 · ~/garden" },
      { property: "og:description", content: "关于这座数字花园——架构、理念，以及数字孪生的工作原理。" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  const t = useT();
  return (
    <PageTransition>
      <section className="mx-auto max-w-3xl px-4 py-12">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{t.about.cmd}</p>
        <h1 className="mt-2 text-3xl font-semibold text-foreground">{t.about.title}</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>{t.about.p1}</p>
          <p>
            {t.about.p2Pre}
            <span className="font-mono text-primary">{t.about.p2Tanstack}</span>
            {t.about.p2Mid}
            <span className="font-mono text-primary">{t.about.p2Cmd}</span>
            {t.about.p2Tail}
          </p>
          <p>{t.about.p3}</p>
        </div>
      </section>
    </PageTransition>
  );
}