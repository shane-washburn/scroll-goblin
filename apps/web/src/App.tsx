import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import { Check, Globe2, Trophy } from "lucide-react";
import {
  HedgelingProvider,
  initGoogleAnalytics,
  resolvePreferredLocale,
  trackPageDuration,
  trackPageView,
  trackVisit,
  useTranslation,
} from "@scroll-goblin/ui";
import { MODULES } from "./modules/registry";
import Landing from "./pages/Landing";
import Leaderboard from "./pages/Leaderboard";
import NotFound from "./pages/NotFound";
import RouteMeta from "./seo/RouteMeta";
import { SITE_NAME, pageTitle } from "./seo/site";

const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const LANGUAGE_STORAGE_KEY = "scroll-goblin-language";
const SOURCE_LOCALE = "en-US";

const LANGUAGES = [
  { code: "en-US", englishName: "English", label: "English" },
  { code: "nl-NL", englishName: "Dutch", label: "Nederlands" },
  { code: "en-AU", englishName: "English (Australia)", label: "English (Australia)" },
  { code: "en-CA", englishName: "English (Canada)", label: "English (Canada)" },
  { code: "en-GB", englishName: "English (United Kingdom)", label: "English (United Kingdom)" },
  { code: "en-IN", englishName: "English (India)", label: "English (India)" },
  { code: "fr-CA", englishName: "French (Canada)", label: "Français (Canada)" },
  { code: "hi-IN", englishName: "Hindi", label: "हिन्दी" },
  { code: "pl-PL", englishName: "Polish", label: "Polski" },
  { code: "ru-RU", englishName: "Russian", label: "Русский" },
  { code: "es-ES", englishName: "Spanish", label: "Español" },
  { code: "sv-SE", englishName: "Swedish", label: "Svenska" },
  { code: "uk-UA", englishName: "Ukrainian", label: "Українська" },
] as const;

type LanguageCode = (typeof LANGUAGES)[number]["code"];
const SUPPORTED_LOCALES = LANGUAGES.map((language) => language.code);

function isLanguageCode(value: string | null): value is LanguageCode {
  return LANGUAGES.some((language) => language.code === value);
}

function browserPreferredLocales(): string[] {
  if (typeof window === "undefined") return [];
  return navigator.languages?.length
    ? [...navigator.languages]
    : navigator.language
      ? [navigator.language]
      : [];
}

function initialLanguage(): LanguageCode {
  if (typeof window === "undefined") return SOURCE_LOCALE;
  const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  const resolved = resolvePreferredLocale({
    preferredLocales: storedLanguage
      ? [storedLanguage, ...browserPreferredLocales()]
      : browserPreferredLocales(),
    supportedLocales: SUPPORTED_LOCALES,
    sourceLocale: SOURCE_LOCALE,
  });
  return isLanguageCode(resolved) ? resolved : SOURCE_LOCALE;
}

/**
 * The shell: owns global chrome (nav, background, footer) and routing.
 * Each module is lazy-loaded into its own chunk, so the landing page bundle
 * stays small no matter how many modules the suite grows to.
 */
const moduleRoutes = MODULES.map((m) => ({
  ...m,
  Component: lazy(m.load),
}));

/**
 * Records one leaderboard visit per module navigation. Lives in the shell so
 * individual modules never have to think about visit counting.
 */
function VisitTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    const module = MODULES.find(
      (m) => pathname === m.path || pathname.startsWith(`${m.path}/`)
    );
    if (module) trackVisit(module.id);
  }, [pathname]);
  return null;
}

function routeAnalytics(pathname: string) {
  if (pathname === "/") {
    return { path: "/", title: SITE_NAME };
  }
  if (pathname === "/leaderboard") {
    return { path: "/leaderboard", title: pageTitle("Leaderboard") };
  }
  const module = MODULES.find(
    (m) => pathname === m.path || pathname.startsWith(`${m.path}/`)
  );
  if (module) {
    return {
      path: module.path,
      title: pageTitle(module.title),
      moduleId: module.id,
    };
  }
  return { path: pathname, title: pageTitle("404: Goblin not found") };
}

function GoogleAnalyticsTracker() {
  const { pathname } = useLocation();
  const current = useRef<{
    path: string;
    title: string;
    moduleId?: string;
    startedAt: number;
  } | null>(null);

  useEffect(() => {
    initGoogleAnalytics(GA_MEASUREMENT_ID);
  }, []);

  useEffect(() => {
    const now = performance.now();
    if (current.current) {
      trackPageDuration({
        path: current.current.path,
        title: current.current.title,
        moduleId: current.current.moduleId,
        durationMs: now - current.current.startedAt,
      });
    }

    const next = routeAnalytics(pathname);
    current.current = { ...next, startedAt: now };
    trackPageView(next);
  }, [pathname]);

  useEffect(() => {
    const flushDuration = () => {
      if (!current.current) return;
      trackPageDuration({
        path: current.current.path,
        title: current.current.title,
        moduleId: current.current.moduleId,
        durationMs: performance.now() - current.current.startedAt,
      });
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flushDuration();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushDuration);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushDuration);
      flushDuration();
    };
  }, []);

  return null;
}

function LanguageSelector() {
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] =
    useState<LanguageCode>(initialLanguage);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const currentLanguage =
    LANGUAGES.find((language) => language.code === selectedLanguage) ??
    LANGUAGES[0];

  useEffect(() => {
    document.documentElement.lang = selectedLanguage;
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, selectedLanguage);
    window.dispatchEvent(
      new CustomEvent("scroll-goblin:language-change", {
        detail: {
          code: selectedLanguage,
          label: currentLanguage.label,
          englishName: currentLanguage.englishName,
        },
      })
    );
  }, [currentLanguage, selectedLanguage]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative" data-hedgeling-language-selector>
      <button
        type="button"
        aria-label={t("Language: {language}", {
          language: currentLanguage.label,
        })}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="inline-flex h-8 w-8 items-center justify-center rounded-neobrutal border-thin border-brand-border bg-brand-secondary text-brand-text shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
        onClick={() => setIsOpen((open) => !open)}
      >
        <Globe2 className="h-4 w-4" />
      </button>
      {isOpen ? (
        <div
          role="menu"
          aria-label={t("Languages")}
          className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-neobrutal border-thin border-brand-border bg-brand-surface shadow-neo"
        >
          {LANGUAGES.map((language) => {
            const isSelected = language.code === selectedLanguage;
            return (
              <button
                key={language.code}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                lang={language.code}
                data-hedgeling-language={language.code}
                className="flex w-full items-center justify-between gap-3 border-b-thin border-brand-border px-3 py-2 text-left text-xs font-bold text-brand-text last:border-b-0 hover:bg-brand-warning"
                onClick={() => {
                  setSelectedLanguage(language.code);
                  setIsOpen(false);
                }}
              >
                <span>{language.label}</span>
                {isSelected ? <Check className="h-3.5 w-3.5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function AppContent() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-brand-background font-body text-brand-text">
      <nav className="sticky top-0 z-40 border-b-thick border-brand-border bg-brand-background">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link
            to="/"
            className="font-heading text-sm uppercase text-brand-text transition hover:bg-brand-warning"
          >
            {t("Scroll Goblin")}
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/leaderboard"
              className="inline-flex items-center gap-1 rounded-neobrutal border-thin border-brand-border bg-brand-warning px-3 py-1 text-xs font-bold text-brand-text shadow-neo-sm transition-[transform,box-shadow] duration-100 active:translate-x-0.5 active:translate-y-0.5 active:shadow-neo-pressed"
            >
              <Trophy className="h-3.5 w-3.5" />
              {t("Leaderboard")}
            </Link>
            <LanguageSelector />
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Suspense
          fallback={
            <div className="py-24 text-center font-bold text-brand-text">
              Loading...
            </div>
          }
        >
          <VisitTracker />
          <RouteMeta />
          <GoogleAnalyticsTracker />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            {moduleRoutes.map((m) => (
              <Route key={m.id} path={`${m.path}/*`} element={<m.Component />} />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="border-t-thick border-brand-border bg-brand-surface px-4 py-6 text-center text-xs font-bold text-brand-text">
        {t("Decoupled monorepo / React + TS shell / Hono API / Vercel AI SDK (Gemini)")}
      </footer>
      <Analytics />
    </div>
  );
}

export default function App() {
  return (
    <HedgelingProvider
      sourceLocale={SOURCE_LOCALE}
      languageStorageKey={LANGUAGE_STORAGE_KEY}
      supportedLocales={SUPPORTED_LOCALES}
    >
      <AppContent />
    </HedgelingProvider>
  );
}
