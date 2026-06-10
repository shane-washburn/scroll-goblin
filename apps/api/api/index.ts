import { Hono } from "hono";
import { handle } from "hono/vercel";
import { app } from "../src/app.js";

/**
 * Vercel serverless function entry (Edge runtime).
 *
 * Reached via the vercel.json rewrite `/api/(.*) -> /api`, which maps every
 * /api/* request to this function. The app is mounted under /api, so production
 * routes are /api/health and /api/v1/translate. Local dev (src/index.ts) is
 * unchanged and serves /health and /v1/translate directly.
 *
 * We use the Edge runtime + hono/vercel so the request is a native Web Request
 * and `c.req.json()` reads the body directly. The Node runtime buffers/consumes
 * the request body before the handler runs (and the Next.js-only
 * `config.api.bodyParser` flag is ignored by @vercel/node), which deadlocked
 * POST bodies. Edge has no node:crypto, which is why cache.ts no longer uses it.
 */
export const config = {
  runtime: "edge",
};

const vercelApp = new Hono();
vercelApp.route("/api", app);

export default handle(vercelApp);
