import { useEffect, useRef } from "react";
import type { RefObject } from "react";

/** How the game card is positioned within the mobile viewport on mount. */
export interface MobileGameFitOptions {
  /**
   * - `"bottom"` (default): scroll so the card's bottom edge sits at the
   *   bottom of the screen — best when the interactive surface lives at the
   *   bottom of a tall card (balloon, grass, slug, chicken).
   * - `"top"`: scroll so the card's top edge sits just below the sticky nav —
   *   best when the important content (tray, button) lives at the top and
   *   bottom-aligning would push it out of frame.
   */
  align?: "top" | "bottom";
}

/**
 * On mobile, module pages open scrolled to the top, where the tall header
 * pushes the game surface past the bottom of the viewport. This hook scrolls
 * the page on mount so the attached element (the game card) is framed nicely:
 * either bottom-aligned to the screen, or top-aligned just below the nav.
 *
 * Attach the returned ref to the game's outer Card. Desktop is untouched —
 * the effect only runs on coarse-pointer (touch) devices. The alignment runs
 * once after the lazy-loaded module paints, and once more shortly after, in
 * case fonts/images shift layout; it backs off as soon as the user scrolls.
 */
export function useMobileGameFit<T extends HTMLElement>(
  options: MobileGameFitOptions = {}
): RefObject<T> {
  const { align: mode = "bottom" } = options;
  const ref = useRef<T>(null!);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const isTouch =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) return;

    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };

    const align = () => {
      if (cancelled) return;
      const rect = el.getBoundingClientRect();
      let top: number;
      if (mode === "top") {
        // Sit the card top just below the sticky nav so its header/content is
        // fully in frame. The nav stays pinned, so we offset by its height.
        const nav = document.querySelector("nav");
        const navHeight = nav ? nav.getBoundingClientRect().height : 0;
        top = Math.max(0, Math.round(rect.top + window.scrollY - navHeight));
      } else {
        // visualViewport tracks the *actual* visible height on mobile (URL bar
        // shown/hidden, etc.) more reliably than innerHeight on older browsers.
        const viewport = window.visualViewport?.height ?? window.innerHeight;
        const bottom = rect.bottom + window.scrollY;
        top = Math.max(0, Math.round(bottom - viewport));
      }
      window.scrollTo({ top, behavior: "auto" });
    };

    // Two frames lets the lazy-loaded module chunk paint before measuring.
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        align();
        // Any user scroll intent after the first alignment wins.
        window.addEventListener("touchstart", cancel, {
          passive: true,
          once: true,
        });
        window.addEventListener("wheel", cancel, { passive: true, once: true });
      });
    });
    // Re-align once more after late layout shifts (web fonts, images).
    const timer = window.setTimeout(align, 350);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
      window.removeEventListener("touchstart", cancel);
      window.removeEventListener("wheel", cancel);
    };
  }, [mode]);

  return ref;
}
