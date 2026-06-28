import { useEffect, useRef, useState } from "react";
import { Check, Globe2 } from "lucide-react";

/**
 * Language switcher for the Hedgeling content-match injector. Picking a locale
 * persists it and reloads so the injector re-applies translations from a clean
 * (source-English) DOM. Native language names are intentionally not translated.
 */
const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "nl-NL", label: "Nederlands" },
  { code: "en-AU", label: "English (Australia)" },
  { code: "en-CA", label: "English (Canada)" },
  { code: "en-GB", label: "English (United Kingdom)" },
  { code: "en-IN", label: "English (India)" },
  { code: "fr-CA", label: "Français (Canada)" },
  { code: "hi-IN", label: "हिन्दी" },
  { code: "pl-PL", label: "Polski" },
  { code: "ru-RU", label: "Русский" },
  { code: "es-ES", label: "Español" },
  { code: "sv-SE", label: "Svenska" },
  { code: "uk-UA", label: "Українська" },
] as const;

const STORAGE_KEY = "hedgeling.locale";

function currentLocale(): string {
  if (typeof window === "undefined") return "en-US";
  return window.localStorage.getItem(STORAGE_KEY) || document.documentElement.lang || "en-US";
}

export function LanguageSelector() {
  const [selected] = useState(currentLocale);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const current = LANGUAGES.find((language) => language.code === selected) ?? LANGUAGES[0];

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
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

  const choose = (code: string) => {
    setIsOpen(false);
    if (code === selected) return;
    window.localStorage.setItem(STORAGE_KEY, code);
    document.documentElement.lang = code;
    window.location.reload();
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={`Language: ${current.label}`}
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
          aria-label="Languages"
          className="absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-neobrutal border-thin border-brand-border bg-brand-surface shadow-neo"
        >
          {LANGUAGES.map((language) => {
            const isSelected = language.code === selected;
            return (
              <button
                key={language.code}
                type="button"
                role="menuitemradio"
                aria-checked={isSelected}
                lang={language.code}
                className="flex w-full items-center justify-between gap-3 border-b-thin border-brand-border px-3 py-2 text-left text-xs font-bold text-brand-text last:border-b-0 hover:bg-brand-warning"
                onClick={() => choose(language.code)}
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
