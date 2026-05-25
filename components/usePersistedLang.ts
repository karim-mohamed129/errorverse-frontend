import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./Header";

/*
  Online English default fix
  --------------------------
  Old live versions may have saved Arabic in localStorage keys such as:
  site_lang / siteLang / appLang / lang / i18nextLng.

  We now read from a new versioned key only. On the first online load,
  there is no v2 key, so the app starts in English and then rewrites
  the old keys to English. If the user manually chooses Arabic later,
  Arabic will still be saved normally.
*/
const STORAGE_KEY = "error505_site_lang_v2";
const LEGACY_STORAGE_KEYS = ["site_lang", "siteLang", "appLang", "lang", "i18nextLng"];
const LANG_CHANGE_EVENT = "error505-language-change";
const DEFAULT_LANG: Lang = "en";

function isLang(value: unknown): value is Lang {
  return value === "ar" || value === "en";
}

function readSavedLang(defaultLang: Lang = DEFAULT_LANG): Lang {
  if (typeof window === "undefined") return defaultLang;

  try {
    const urlLang = new URL(window.location.href).searchParams.get("lang");
    if (isLang(urlLang)) return urlLang;

    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;

    return defaultLang;
  } catch {
    return defaultLang;
  }
}

function applyDocumentLang(lang: Lang) {
  if (typeof document === "undefined") return;

  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  document.body.dir = lang === "ar" ? "rtl" : "ltr";
}

function writeSavedLang(lang: Lang) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, lang);

    // Keep old keys synced so old code cannot force Arabic again.
    LEGACY_STORAGE_KEYS.forEach((key) => window.localStorage.setItem(key, lang));
  } catch {
    // ignore storage errors
  }
}

export function usePersistedLang(defaultLang: Lang = DEFAULT_LANG) {
  const [lang, setLangState] = useState<Lang>(() => readSavedLang(defaultLang));

  useEffect(() => {
    const saved = readSavedLang(defaultLang);
    setLangState(saved);
    applyDocumentLang(saved);
    writeSavedLang(saved);
  }, [defaultLang]);

  const setLang = useCallback((nextLang: Lang) => {
    setLangState(nextLang);
    applyDocumentLang(nextLang);
    writeSavedLang(nextLang);

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(LANG_CHANGE_EVENT, { detail: nextLang }));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncLang = (event?: Event) => {
      const eventLang =
        event instanceof CustomEvent && isLang(event.detail) ? event.detail : readSavedLang(defaultLang);

      setLangState(eventLang);
      applyDocumentLang(eventLang);
      writeSavedLang(eventLang);
    };

    window.addEventListener("storage", syncLang);
    window.addEventListener("focus", syncLang);
    window.addEventListener(LANG_CHANGE_EVENT, syncLang);

    return () => {
      window.removeEventListener("storage", syncLang);
      window.removeEventListener("focus", syncLang);
      window.removeEventListener(LANG_CHANGE_EVENT, syncLang);
    };
  }, [defaultLang]);

  return [lang, setLang] as const;
}
