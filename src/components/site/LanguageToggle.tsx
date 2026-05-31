import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n/provider";
import { localeNames, locales, type Locale } from "@/lib/i18n/translations";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const next: Locale = locale === "zh" ? "en" : "zh";
  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={t.locale.switch}
      title={`${t.locale.switch} → ${localeNames[next]}`}
      className="ml-1 inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <Languages className="h-3 w-3" />
      <span>{localeNames[locale]}</span>
      <span className="opacity-40">/</span>
      <span className="opacity-60">{localeNames[next]}</span>
      <span className="sr-only">
        {locales.join(", ")}
      </span>
    </button>
  );
}