"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentLang,
  getDict,
  readStoredLang,
  translate,
  type Lang,
  type LocaleDict,
} from "@/lib/i18n";

interface LocaleContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  dict: LocaleDict;
  t: (path: string, fallback: string, vars?: Record<string, string | number | undefined | null>) => string;
  isRtl: boolean;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Initialize with stored language directly
  const [lang, setLangState] = useState<Lang>(() => readStoredLang());

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    if (typeof window !== "undefined") localStorage.setItem("amer_lang", next);
    applyDocumentLang(next);
  }, []);

  useEffect(() => {
    applyDocumentLang(lang);
  }, [lang]);

  const dict = useMemo(() => getDict(lang), [lang]);

  const t = useCallback(
    (path: string, fallback: string, vars?: Record<string, string | number | undefined | null>) =>
      translate(dict, path, fallback, vars),
    [dict],
  );

  const value = useMemo(
    () => ({ lang, setLang, dict, t, isRtl: lang === "ar" }),
    [lang, setLang, dict, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Safe hook for pages outside LocaleProvider (returns English defaults). */
export function useLocaleOptional(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  const dict = getDict("en");
  return (
    ctx ?? {
      lang: "en",
      setLang: () => {},
      dict,
      t: (path, fallback, vars) => translate(dict, path, fallback, vars),
      isRtl: false,
    }
  );
}
