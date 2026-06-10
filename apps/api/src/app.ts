import { Hono } from "hono";
import { cors } from "hono/cors";
import { generateObject } from "ai";
import {
  TranslateRequestSchema,
  TranslationResultSchema,
  type TranslateResponse,
} from "@emoji/shared";
import { getModel, getModelId } from "./ai.js";
import { buildPrompt } from "./prompt.js";
import { cacheKey, getCached, setCached } from "./cache.js";

/**
 * The Hono application, defined independently of any runtime.
 *
 * Local dev runs it via @hono/node-server (see index.ts); production runs the
 * exact same `app` as a Vercel serverless function (see ../api/index.ts).
 */
export const app = new Hono();

const corsOrigins = (process.env.CORS_ORIGIN ?? "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());

app.use("*", cors({ origin: corsOrigins }));

app.get("/health", (c) => c.json({ ok: true, model: getModelId() }));

app.post("/v1/translate", async (c) => {
  // 1. Validate against the shared contract.
  const body = await c.req.json().catch(() => null);
  const parsed = TranslateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return c.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      400
    );
  }
  const req = parsed.data;

  // 2. Serve from cache when possible (zero tokens on repeats).
  const key = cacheKey(req);
  const cached = getCached(key);
  if (cached) {
    return c.json({ ...cached, cached: true } satisfies TranslateResponse);
  }

  // 3. Build the direction-specific prompt and call the LLM for structured JSON.
  const { system, prompt } = buildPrompt(req);
  try {
    const { object } = await generateObject({
      model: getModel(),
      schema: TranslationResultSchema,
      system,
      prompt,
    });

    const response: TranslateResponse = {
      result: object,
      model: getModelId(),
      cached: false,
    };
    setCached(key, response);
    return c.json(response);
  } catch (err) {
    console.error("Translation failed:", err);

    // Surface auth/config problems clearly instead of a generic 502.
    const message =
      err && typeof err === "object" && "message" in err
        ? String((err as { message: unknown }).message)
        : String(err);
    const isAuthError = /api key|unauthorized|permission|invalid_argument/i.test(
      message
    );

    if (isAuthError) {
      return c.json(
        {
          error:
            "LLM provider rejected the request (check GOOGLE_GENERATIVE_AI_API_KEY).",
          details: message,
        },
        401
      );
    }

    return c.json({ error: "Translation failed", details: message }, 502);
  }
});
