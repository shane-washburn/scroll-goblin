import { handle } from "hono/vercel";
import { app } from "../src/app.js";

/**
 * Vercel serverless function entry.
 *
 * Vercel treats files under /api as functions. The vercel.json rewrite sends
 * every request here, and Hono routes on the original path (/health,
 * /v1/translate). We use the Node.js runtime because the cache layer relies on
 * node:crypto, which is unavailable on the Edge runtime.
 */
export const config = {
  runtime: "nodejs",
};

export default handle(app);
