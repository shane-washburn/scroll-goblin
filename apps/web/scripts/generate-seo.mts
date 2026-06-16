/**
 * Post-build SEO generation, run after `vite build` (see package.json).
 *
 * From the module registry (single source of truth) it emits into dist/:
 *   - robots.txt     allow-all + explicit AI crawler welcome + sitemap pointer
 *   - sitemap.xml    landing, leaderboard, and every non-hidden module route
 *   - llms.txt       plain-markdown site summary for AI agents
 *   - <route>/index.html   a copy of the built shell per route with the
 *     title/description/canonical/OG tags rewritten, so crawlers that don't
 *     execute JS still see correct per-page metadata (Vercel serves these
 *     static files before the SPA rewrite kicks in).
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { MODULES } from "../src/modules/registry";
import {
  SITE_ABOUT,
  SITE_DESCRIPTION,
  SITE_FACTS,
  SITE_FAQ,
  SITE_LANG,
  SITE_LOGO,
  SITE_NAME,
  SITE_URL,
  STATIC_PAGES,
  pageTitle,
} from "../src/seo/site";

const dist = resolve(dirname(fileURLToPath(import.meta.url)), "../dist");

/** Build timestamp (date only) used as schema.org dateModified. */
const BUILD_DATE = new Date().toISOString().slice(0, 10);

/** Stable JSON-LD node @ids so graph nodes can cross-reference each other. */
const ORG_ID = `${SITE_URL}/#organization`;
const SITE_ID = `${SITE_URL}/#website`;

interface Page {
  path: string;
  title: string;
  description: string;
}

const modulePages: Page[] = MODULES.filter((m) => m.status !== "hidden").map(
  (m) => ({ path: m.path, title: m.title, description: m.description })
);
const pages: Page[] = [...STATIC_PAGES, ...modulePages];

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// --- robots.txt ---
// Explicitly welcome the major AI crawlers and assistant user-agents. Listing
// each one is an "AI openness" signal that scanners (e.g. BuiltWith) detect.
const aiBots = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Meta-ExternalAgent",
  "Diffbot",
];
writeFileSync(
  join(dist, "robots.txt"),
  [
    "User-agent: *",
    "Allow: /",
    "",
    ...aiBots.flatMap((bot) => [`User-agent: ${bot}`, "Allow: /", ""]),
    `Sitemap: ${SITE_URL}/sitemap.xml`,
    "",
  ].join("\n")
);

// --- sitemap.xml ---
writeFileSync(
  join(dist, "sitemap.xml"),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...pages.map(
      (p) => `  <url><loc>${SITE_URL}${p.path === "/" ? "/" : p.path}</loc></url>`
    ),
    "</urlset>",
    "",
  ].join("\n")
);

// --- llms.txt ---
writeFileSync(
  join(dist, "llms.txt"),
  [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    SITE_ABOUT,
    "",
    "## Good to know",
    "",
    ...SITE_FACTS.map((f) => `- ${f}`),
    "",
    "## Apps",
    "",
    ...modulePages.map(
      (p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`
    ),
    "",
    "## Other pages",
    "",
    ...STATIC_PAGES.filter((p) => p.path !== "/").map(
      (p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`
    ),
    "",
  ].join("\n")
);

// --- llms-full.txt ---
// The llmstxt.org "full" companion: a single self-contained document an agent
// can read without crawling further. Inlines the site summary, facts, FAQ, and
// the full title+description of every app and static page.
writeFileSync(
  join(dist, "llms-full.txt"),
  [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_DESCRIPTION}`,
    "",
    SITE_ABOUT,
    "",
    "## Good to know",
    "",
    ...SITE_FACTS.map((f) => `- ${f}`),
    "",
    "## Frequently asked questions",
    "",
    ...SITE_FAQ.flatMap((f) => [`### ${f.question}`, "", f.answer, ""]),
    "## Apps",
    "",
    ...modulePages.flatMap((p) => [
      `### ${p.title}`,
      "",
      `URL: ${SITE_URL}${p.path}`,
      "",
      p.description,
      "",
    ]),
    "## Other pages",
    "",
    ...STATIC_PAGES.filter((p) => p.path !== "/").flatMap((p) => [
      `### ${p.title}`,
      "",
      `URL: ${SITE_URL}${p.path}`,
      "",
      p.description,
      "",
    ]),
  ].join("\n")
);

// --- per-route prerendered HTML shells ---
const shell = readFileSync(join(dist, "index.html"), "utf8");

const modulePaths = new Set(modulePages.map((p) => p.path));

/** Organization + WebSite nodes, shared (by @id) across every page's graph. */
const baseNodes = [
  {
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: { "@type": "ImageObject", url: SITE_LOGO },
    description: SITE_DESCRIPTION,
  },
  {
    "@type": "WebSite",
    "@id": SITE_ID,
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: SITE_LANG,
    publisher: { "@id": ORG_ID },
  },
];

/**
 * Builds a JSON-LD @graph for a page. Every page shares the Organization and
 * WebSite nodes; the home page adds a FAQPage, module pages add a
 * WebApplication + BreadcrumbList, and other static pages add a WebPage.
 */
function buildGraph(page: Page): object {
  const url = `${SITE_URL}${page.path === "/" ? "/" : page.path}`;
  const nodes: object[] = [...baseNodes];

  if (page.path === "/") {
    nodes.push({
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#faq`,
      isPartOf: { "@id": SITE_ID },
      inLanguage: SITE_LANG,
      mainEntity: SITE_FAQ.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    });
  } else {
    nodes.push({
      "@type": modulePaths.has(page.path) ? "WebApplication" : "WebPage",
      name: pageTitle(page.title),
      url,
      description: page.description,
      inLanguage: SITE_LANG,
      dateModified: BUILD_DATE,
      isPartOf: { "@id": SITE_ID },
      publisher: { "@id": ORG_ID },
      ...(modulePaths.has(page.path)
        ? {
            applicationCategory: "EntertainmentApplication",
            operatingSystem: "Web",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          }
        : {}),
    });
    nodes.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: SITE_NAME,
          item: `${SITE_URL}/`,
        },
        { "@type": "ListItem", position: 2, name: page.title, item: url },
      ],
    });
  }

  return { "@context": "https://schema.org", "@graph": nodes };
}

function applyMeta(html: string, page: Page): string {
  const title = escapeHtml(pageTitle(page.title));
  const description = escapeHtml(page.description);
  const url = `${SITE_URL}${page.path === "/" ? "/" : page.path}`;
  let out = html
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(/(name="description"[\s\S]*?content=")[^"]*(")/, `$1${description}$2`)
    .replace(
      /(property="og:description"[\s\S]*?content=")[^"]*(")/,
      `$1${description}$2`
    )
    .replace(
      /(name="twitter:description"[\s\S]*?content=")[^"]*(")/,
      `$1${description}$2`
    )
    .replace(/(rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
    .replace(/(property="og:url"[\s\S]*?content=")[^"]*(")/, `$1${url}$2`)
    .replace(/(property="og:title"[\s\S]*?content=")[^"]*(")/, `$1${title}$2`)
    .replace(/(name="twitter:title"[\s\S]*?content=")[^"]*(")/, `$1${title}$2`);

  // Replace the shell's single JSON-LD block with this page's richer @graph.
  out = out.replace(
    /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
    `<script type="application/ld+json">${JSON.stringify(buildGraph(page))}</script>`
  );

  // Invisible discovery hints pointing crawlers/agents at the markdown corpora.
  out = out.replace(
    "</head>",
    `<link rel="alternate" type="text/markdown" title="llms.txt" href="${SITE_URL}/llms.txt" />` +
      `<link rel="alternate" type="text/markdown" title="llms-full.txt" href="${SITE_URL}/llms-full.txt" /></head>`
  );
  return out;
}

/** A crawlable link list of every app, used for internal linking. */
function appList(exclude?: string): string {
  return modulePages
    .filter((m) => m.path !== exclude)
    .map(
      (m) =>
        `<li><a href="${m.path}"><strong>${escapeHtml(
          m.title
        )}</strong> \u2014 ${escapeHtml(m.description)}</a></li>`
    )
    .join("");
}

/**
 * Readable HTML injected into #root. React's createRoot() replaces it on
 * load, so users get the live app while no-JS crawlers and LLMs keep this
 * static content (and follow its internal links to discover every page).
 */
function renderBody(page: Page): string {
  if (page.path === "/") {
    return (
      `<main class="mx-auto max-w-4xl px-4 py-8">` +
      `<h1 class="font-heading text-4xl uppercase">${escapeHtml(SITE_NAME)}</h1>` +
      `<p class="mt-3 font-bold">${escapeHtml(SITE_DESCRIPTION)}</p>` +
      `<p class="mt-3">${escapeHtml(SITE_ABOUT)}</p>` +
      `<h2 class="mt-6 font-heading text-2xl uppercase">Good to know</h2>` +
      `<ul>${SITE_FACTS.map((f) => `<li>${escapeHtml(f)}</li>`).join("")}</ul>` +
      `<h2 class="mt-6 font-heading text-2xl uppercase">Apps</h2>` +
      `<ul>${appList()}` +
      `<li><a href="/leaderboard"><strong>Leaderboard</strong> \u2014 ` +
      `${escapeHtml(STATIC_PAGES[1].description)}</a></li></ul>` +
      `</main>`
    );
  }
  return (
    `<main class="mx-auto max-w-4xl px-4 py-8">` +
    `<h1 class="font-heading text-4xl uppercase">${escapeHtml(page.title)}</h1>` +
    `<p class="mt-3 font-bold">${escapeHtml(page.description)}</p>` +
    `<p class="mt-4"><a href="/">${escapeHtml(SITE_NAME)} home</a></p>` +
    `<h2 class="mt-6 font-heading text-2xl uppercase">More apps</h2>` +
    `<ul>${appList(page.path)}</ul>` +
    `</main>`
  );
}

function prerender(page: Page): string {
  return applyMeta(shell, page).replace(
    '<div id="root"></div>',
    `<div id="root">${renderBody(page)}</div>`
  );
}

for (const page of pages) {
  if (page.path === "/") {
    writeFileSync(join(dist, "index.html"), prerender(page));
    continue;
  }
  const dir = join(dist, ...page.path.split("/").filter(Boolean));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), prerender(page));
}

console.log(
  `[generate-seo] wrote robots.txt, sitemap.xml, llms.txt, llms-full.txt and ${pages.length} prerendered pages (incl. home) to dist/`
);
