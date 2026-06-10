# Emoji Translator

AI-powered translator that converts **human language → emoji** and **emoji → a selected human language**.

Built as a **decoupled monorepo** so the frontend, backend, and LLM provider are each independently swappable.

```
emoji-translator/
├── apps/
│   ├── web/        # Vite + React + TypeScript SPA (talks ONLY to the API)
│   └── api/        # Hono backend (holds the API key, calls the LLM)
└── packages/
    └── shared/     # Zod schemas + TS types = the contract both apps depend on
```

## Architecture

```
Browser (React + TS)  --HTTP/JSON-->  API (Hono + Vercel AI SDK)  -->  LLM (Gemini)
        |                                      |
        +------------ @emoji/shared (Zod contract) -----------+
```

- **Decoupled:** the web app only knows a base URL (`VITE_API_BASE_URL`) and the shared contract. Swap either side freely.
- **Provider-agnostic:** the backend uses the **Vercel AI SDK**. Default provider is **Google Gemini**; switch via `AI_PROVIDER` env + the matching SDK (see `apps/api/src/ai.ts`).
- **Secure:** the LLM API key lives only in the backend, never in the browser.
- **Structured output:** the model returns `{ translation, alternatives[], notes }` validated by Zod.
- **Cached:** identical requests are served from an in-memory cache (swap for Redis in prod).

## Tech Stack

| Layer    | Choice |
|----------|--------|
| Frontend | React, TypeScript, Vite, Tailwind CSS, Lucide |
| Backend  | Node, Hono, Vercel AI SDK (`ai`), Zod |
| LLM      | Google Gemini (default, provider-agnostic) |
| Contract | `@emoji/shared` (Zod) |
| Tooling  | pnpm workspaces |

## Prerequisites

- Node 18+
- pnpm 9+ (`npm install -g pnpm`)
- A Google Gemini API key: https://aistudio.google.com/apikey

## Setup

```bash
pnpm install

# Backend env
cp apps/api/.env.example apps/api/.env
#   then set GOOGLE_GENERATIVE_AI_API_KEY in apps/api/.env

# Frontend env
cp apps/web/.env.example apps/web/.env
```

> On Windows PowerShell use `Copy-Item apps/api/.env.example apps/api/.env`.

## Run (dev)

```bash
pnpm dev
```

This builds the shared package, then starts the API (`http://localhost:8787`) and the web app (`http://localhost:5173`) together.

Run individually:

```bash
pnpm build:shared
pnpm dev:api
pnpm dev:web
```

## API

`POST /v1/translate`

```jsonc
// request
{
  "input": "I love pizza and coffee",
  "direction": "text-to-emoji",     // or "emoji-to-text"
  "targetLanguage": "en"
}
// response
{
  "result": { "translation": "❤️🍕☕", "alternatives": ["😍🍕☕"], "notes": "..." },
  "model": "gemini-2.0-flash",
  "cached": false
}
```

## Swapping the LLM provider

1. Install the provider SDK, e.g. `pnpm --filter @emoji/api add @ai-sdk/openai`
2. Uncomment its case in `apps/api/src/ai.ts`
3. Set `AI_PROVIDER=openai` and the matching key in `apps/api/.env`

No frontend changes required.
