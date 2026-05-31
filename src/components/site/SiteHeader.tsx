import { Link } from "@tanstack/react-router";
import { Terminal, Command as CmdIcon } from "lucide-react";
import { useT } from "@/lib/i18n/provider";
import { LanguageToggle } from "./LanguageToggle";

export function SiteHeader() {
  const t = useT();
  const linkBase =
    "rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:text-foreground";
  const linkActive = "text-foreground";

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-mono text-sm">
          <Terminal className="h-4 w-4 text-primary" />
          <span className="text-foreground">{t.site.brand}</span>
          <span className="animate-pulse text-primary">_</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/posts" className={linkBase} activeProps={{ className: `${linkBase} ${linkActive}` }}>
            {t.nav.posts}
          </Link>
          <Link to="/tweets" className={linkBase} activeProps={{ className: `${linkBase} ${linkActive}` }}>
            {t.nav.tweets}
          </Link>
          <Link to="/media" className={linkBase} activeProps={{ className: `${linkBase} ${linkActive}` }}>
            {t.nav.media}
          </Link>
          <Link to="/about" className={linkBase} activeProps={{ className: `${linkBase} ${linkActive}` }}>
            {t.nav.about}
          </Link>
          <span className="ml-2 hidden items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            <CmdIcon className="h-3 w-3" /> K
          </span>
          <LanguageToggle />
        </nav>
      </div>
    </header>
  );
}