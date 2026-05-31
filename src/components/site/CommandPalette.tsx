import { Command } from "cmdk";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, MessageSquare, Image as ImageIcon, Home, User, Search, Sparkles } from "lucide-react";
import { mockPosts, mockTweets, pick } from "@/lib/mock-data";
import { useI18n } from "@/lib/i18n/provider";

/**
 * Global ⌘K command palette.
 * Phase 1: mock search across routes + posts + tweets.
 * Phase 4: wired to the hybridSearch server fn.
 */
export function CommandPalette() {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setOpen(false);
    setQuery("");
    navigate({ to });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-background/70 px-4 pt-[12vh] backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <Command
        label={t.cmdk.placeholder}
        className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            autoFocus
            placeholder={t.cmdk.placeholder}
            className="w-full bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
            ESC
          </kbd>
        </div>
        <Command.List className="max-h-[60vh] overflow-y-auto p-2">
          <Command.Empty className="px-3 py-8 text-center text-sm text-muted-foreground">
            {t.cmdk.empty.replace("{q}", query)}
          </Command.Empty>

          <Command.Group heading={t.cmdk.groupAsk} className="px-1 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground">
            {query.trim().length > 0 && (
              <CmdItem
                onSelect={() => go("/")}
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                title={`${t.cmdk.askPrefix}"${query}"`}
                hint={t.cmdk.enter}
              />
            )}
          </Command.Group>

          <Command.Group heading={t.cmdk.groupNav} className="px-1 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground">
            <CmdItem onSelect={() => go("/")} icon={<Home className="h-4 w-4" />} title={t.cmdk.home} />
            <CmdItem onSelect={() => go("/posts")} icon={<FileText className="h-4 w-4" />} title={t.nav.posts} />
            <CmdItem onSelect={() => go("/tweets")} icon={<MessageSquare className="h-4 w-4" />} title={t.nav.tweets} />
            <CmdItem onSelect={() => go("/media")} icon={<ImageIcon className="h-4 w-4" />} title={t.nav.media} />
            <CmdItem onSelect={() => go("/about")} icon={<User className="h-4 w-4" />} title={t.nav.about} />
          </Command.Group>

          <Command.Group heading={t.cmdk.groupPosts} className="px-1 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground">
            {mockPosts.map((p) => (
              <CmdItem
                key={p.slug}
                onSelect={() => go("/posts")}
                icon={<FileText className="h-4 w-4 text-muted-foreground" />}
                title={pick(p.title, locale)}
                hint={p.publishedAt}
              />
            ))}
          </Command.Group>

          <Command.Group heading={t.cmdk.groupTweets} className="px-1 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-muted-foreground">
            {mockTweets.map((tw) => {
              const body = pick(tw.body, locale);
              return (
                <CmdItem
                  key={tw.id}
                  onSelect={() => go("/tweets")}
                  icon={<MessageSquare className="h-4 w-4 text-muted-foreground" />}
                  title={body.slice(0, 70) + (body.length > 70 ? "…" : "")}
                  hint={`#${tw.id}`}
                />
              );
            })}
          </Command.Group>
        </Command.List>
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          <span>{t.cmdk.footerLeft}</span>
          <span>{t.cmdk.footerRight}</span>
        </div>
      </Command>
    </div>
  );
}

function CmdItem({
  onSelect,
  icon,
  title,
  hint,
}: {
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <Command.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-accent/15 aria-selected:text-accent-foreground"
    >
      {icon}
      <span className="flex-1 truncate">{title}</span>
      {hint && <span className="font-mono text-[10px] text-muted-foreground">{hint}</span>}
    </Command.Item>
  );
}