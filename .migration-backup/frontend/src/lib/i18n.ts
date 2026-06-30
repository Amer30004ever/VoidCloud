import en from '@/locales/en.json';
import ar from '@/locales/ar.json';

export type Lang = 'en' | 'ar';
export type LocaleDict = typeof en;

const DICTS: Record<Lang, LocaleDict> = { en, ar };

export function getDict(lang: Lang): LocaleDict {
  return DICTS[lang] ?? en;
}

/** Resolve dotted key and replace {{var}} placeholders. */
export function translate(
  dict: LocaleDict,
  path: string,
  fallback: string,
  vars?: Record<string, string | number | undefined | null>,
): string {
  const raw =
    path.split('.').reduce<unknown>((o, k) => {
      if (o && typeof o === 'object' && k in (o as object)) {
        return (o as Record<string, unknown>)[k];
      }
      return undefined;
    }, dict as unknown) ?? fallback;

  let text = typeof raw === 'string' ? raw : fallback;
  if (vars) {
    for (const [key, val] of Object.entries(vars)) {
      if (val === undefined || val === null) continue;
      text = text.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(val));
    }
  }
  return text;
}

export function readStoredLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const v = localStorage.getItem('amer_lang');
  return v === 'ar' ? 'ar' : 'en';
}

export function applyDocumentLang(lang: Lang) {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
}
