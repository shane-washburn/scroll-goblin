import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button, useTranslation } from "@scroll-goblin/ui";

/**
 * Soft-404 for unknown paths. The SPA fallback always returns HTTP 200, so a
 * `noindex` robots tag is injected while this page is mounted to keep junk
 * URLs out of search indexes.
 */
export default function NotFound() {
  const { t } = useTranslation();
  useEffect(() => {
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    return () => robots.remove();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-4 py-24 text-center">
      <div className="mb-5 text-6xl">🧌</div>
      <h1 className="font-heading text-4xl uppercase leading-none text-brand-text">
        {t("404: Goblin not found")}
      </h1>
      <p className="mt-3 text-sm font-bold text-brand-text">
        {t("This page doesn't exist. The goblin probably ate it.")}
      </p>
      <Link to="/" className="mt-6 inline-block">
        <Button className="bg-brand-secondary uppercase">
          {t("Back to the apps")}
        </Button>
      </Link>
    </div>
  );
}
