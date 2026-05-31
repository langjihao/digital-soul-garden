import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { defaultLocale, locales, translations, type Dict, type Locale } from "./translations";

const STORAGE_KEY = "garden.locale";

interface I18nContextValue {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return defaultLocale;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && (locales as readonly string[]).includes(v)) return v as Locale;
    const nav = window.navigator.language?.toLowerCase() ?? "";
    if (nav.startsWith("zh")) return "zh";
    if (nav.startsWith("en")) return "en";
  } catch {}
  return defaultLocale;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start with defaultLocale on SSR + first client paint to avoid hydration mismatch.
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== locale) setLocaleState(stored);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    }
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({ locale, setLocale, t: translations[locale] }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function useT(): Dict {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}