import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type HedgelingBundle = Record<string, Record<string, string>>;
type HedgelingSourceKeyMap = {
  bySource: Record<string, string>;
};

type TranslationValue = string | number | boolean | null | undefined;
type TranslationValues = Record<string, TranslationValue>;

type I18nContextValue = {
  locale: string;
  t: (source: string, values?: TranslationValues) => string;
};

const I18nContext = createContext<I18nContextValue>({
  locale: "en-US",
  t: (source, values) => interpolate(source, values),
});

function normalizeSourceText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function interpolate(source: string, values: TranslationValues = {}): string {
  return source.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
    const value = values[key];
    return value === null || value === undefined ? match : String(value);
  });
}

function baseLanguage(locale: string): string {
  return locale.toLowerCase().split("-")[0] ?? "";
}

export function resolvePreferredLocale({
  preferredLocales,
  supportedLocales,
  sourceLocale = "en-US",
}: {
  preferredLocales: readonly string[];
  supportedLocales: readonly string[];
  sourceLocale?: string;
}): string {
  const supportedByLower = new Map(
    supportedLocales.map((locale) => [locale.toLowerCase(), locale])
  );
  for (const locale of preferredLocales) {
    const exactMatch = supportedByLower.get(locale.toLowerCase());
    if (exactMatch) return exactMatch;
  }

  const sourceBase = baseLanguage(sourceLocale);
  for (const locale of preferredLocales) {
    const preferredBase = baseLanguage(locale);
    if (!preferredBase || preferredBase === sourceBase) continue;
    const languageMatch = supportedLocales.find(
      (supportedLocale) => baseLanguage(supportedLocale) === preferredBase
    );
    if (languageMatch) return languageMatch;
  }

  return sourceLocale;
}

function browserPreferredLocales(): string[] {
  if (typeof window === "undefined") return [];
  return navigator.languages?.length
    ? [...navigator.languages]
    : navigator.language
      ? [navigator.language]
      : [];
}

function initialLocale({
  sourceLocale,
  languageStorageKey,
  supportedLocales,
}: {
  sourceLocale: string;
  languageStorageKey: string;
  supportedLocales: readonly string[];
}): string {
  if (typeof window === "undefined") return sourceLocale;
  const storedLocale = window.localStorage.getItem(languageStorageKey);
  return resolvePreferredLocale({
    preferredLocales: storedLocale
      ? [storedLocale, ...browserPreferredLocales()]
      : browserPreferredLocales(),
    supportedLocales,
    sourceLocale,
  });
}

export function HedgelingProvider({
  children,
  sourceLocale = "en-US",
  languageStorageKey = "scroll-goblin-language",
  supportedLocales = [sourceLocale],
  bundleUrl = "/hedgeling-bundle.json",
  sourceKeyMapUrl = "/hedgeling-source-key-map.json",
}: {
  children: ReactNode;
  sourceLocale?: string;
  languageStorageKey?: string;
  supportedLocales?: readonly string[];
  bundleUrl?: string;
  sourceKeyMapUrl?: string;
}) {
  const [locale, setLocale] = useState(() =>
    initialLocale({ sourceLocale, languageStorageKey, supportedLocales })
  );
  const [bundle, setBundle] = useState<HedgelingBundle>({});
  const [sourceKeyMap, setSourceKeyMap] = useState<HedgelingSourceKeyMap>({
    bySource: {},
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setLocale(
      initialLocale({ sourceLocale, languageStorageKey, supportedLocales })
    );

    const onLanguageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ code?: string }>).detail;
      setLocale(detail?.code ?? sourceLocale);
    };

    window.addEventListener("scroll-goblin:language-change", onLanguageChange);
    return () => {
      window.removeEventListener(
        "scroll-goblin:language-change",
        onLanguageChange
      );
    };
  }, [languageStorageKey, sourceLocale, supportedLocales]);

  useEffect(() => {
    let cancelled = false;

    async function loadTranslations() {
      const [bundleResponse, sourceKeyMapResponse] = await Promise.all([
        fetch(bundleUrl),
        fetch(sourceKeyMapUrl),
      ]);
      if (!bundleResponse.ok || !sourceKeyMapResponse.ok) return;

      const [nextBundle, nextSourceKeyMap] = (await Promise.all([
        bundleResponse.json(),
        sourceKeyMapResponse.json(),
      ])) as [HedgelingBundle, HedgelingSourceKeyMap];

      if (!cancelled) {
        setBundle(nextBundle);
        setSourceKeyMap(nextSourceKeyMap);
      }
    }

    loadTranslations().catch((error) => {
      console.warn("Hedgeling translations failed to load", error);
    });

    return () => {
      cancelled = true;
    };
  }, [bundleUrl, sourceKeyMapUrl]);

  const t = useCallback(
    (source: string, values?: TranslationValues) => {
      const normalized = normalizeSourceText(source);
      if (locale === sourceLocale) return interpolate(normalized, values);

      const key = sourceKeyMap.bySource[normalized];
      const translated = key ? bundle[locale]?.[key] : undefined;
      return interpolate(translated ?? normalized, values);
    },
    [bundle, locale, sourceKeyMap.bySource, sourceLocale]
  );

  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  return useContext(I18nContext);
}
