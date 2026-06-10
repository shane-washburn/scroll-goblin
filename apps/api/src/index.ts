import "dotenv/config";
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { getModelId } from "./ai.js";

/**
 * Local development entry point: runs the shared Hono `app` on a Node server.
 * Production deploys the same `app` as a Vercel serverless function instead
 * (see ../api/index.ts), so this file is only used for `pnpm dev` / `start`.
 */
const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`emoji-translator API listening on http://localhost:${info.port}`);
  console.log(`Provider model: ${getModelId()}`);
});
