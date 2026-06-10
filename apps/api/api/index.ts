import { handle } from "@hono/node-server/vercel";
import { app } from "../src/app.js";

/**
 * Vercel serverless function entry (Node.js runtime).
 *
 * We use @hono/node-server/vercel (NOT hono/vercel): the latter is for the Edge
 * runtime and passes a Web Request straight to app.fetch, which crashes on Node
 * (`req.headers.get is not a function`). We need the Node runtime because the
 * cache layer uses node:crypto, which the Edge runtime lacks.
 *
 * The vercel.json rewrite sends every request here, and Hono routes on the
 * original path (/health, /v1/translate). bodyParser must be disabled so the
 * raw request stream reaches Hono untouched.
 */
export const config = {
  api: {
    bodyParser: false,
  },
};

export default handle(app);
