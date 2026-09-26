import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function resolveStudioPreviewApi(env: Record<string, string | undefined>): string | undefined {
  if (env.VERCEL_ENV !== 'preview') return undefined;
  let related: unknown;
  try { related = JSON.parse(env.VERCEL_RELATED_PROJECTS ?? 'null'); } catch { throw new Error('Studio preview requires valid VERCEL_RELATED_PROJECTS.'); }
  if (!Array.isArray(related)) throw new Error('Studio preview requires its related API project.');
  const api = related.find(value => value?.project?.id === 'prj_7zhfvMDDbt1FYemf2U5dywXsHq1F' && value?.project?.name === 'scrollgoblinapi');
  const host: unknown = api?.preview?.branch;
  if (typeof host !== 'string' || !/^scrollgoblinapi-[a-z0-9-]+-shane-washburn-s-projects\.vercel\.app$/.test(host)) throw new Error('Studio preview API host is missing or outside the approved project.');
  const configured = new URL(env.VITE_API_BASE_URL ?? 'https://scrollgoblinapi.vercel.app/api');
  if (configured.protocol !== 'https:') throw new Error('Studio preview API requires HTTPS.');
  return 'https://' + host + configured.pathname.replace(/\/+$/, '');
}

export function studioPreviewApiConfig() {
  const apiBase = resolveStudioPreviewApi(process.env);
  if (!apiBase) return {};
  const publicDir = join(dirname(fileURLToPath(import.meta.url)), 'public');
  mkdirSync(publicDir, { recursive: true });
  writeFileSync(join(publicDir, 'studio-api.json'), JSON.stringify({ projectId: 'prj_7zhfvMDDbt1FYemf2U5dywXsHq1F', apiOrigin: new URL(apiBase).origin }) + '\n');
  return { define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBase) } };
}
