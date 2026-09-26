/** Allow this arcade's own preview hosts only while running a Vercel preview. */
export function studioPreviewCors(origins: string[], environment = process.env.VERCEL_ENV) {
  if (environment !== 'preview') return origins;
  return (origin: string): string | undefined => {
    if (origins.includes(origin)) return origin;
    return /^https:\/\/scrollgoblin-[a-z0-9-]+-shane-washburn-s-projects\.vercel\.app$/.test(origin) ? origin : undefined;
  };
}
