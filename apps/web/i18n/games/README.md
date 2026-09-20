# New-game translation rollout

These are review catalogs for Woodland Chess and Luna’s Playhouse, including their home-page cards and accessibility labels. `source.json` records English source text and code locations. Locale files are resumable machine drafts, now installed in the runtime bundle for in-browser review. They are not marked human-verified. Existing site translations are preserved.

## Languages

The targets come from `.hedgeling/extract.config.json`, matching the web language selector: English (UK, Australia, Canada, India), French (Canada), Hindi, Dutch, Swedish, Polish, Ukrainian, Russian, Spanish, Portuguese (Brazil), and Arabic (Saudi Arabia). US English remains the source language.

## Generate and validate

From the repository root, using the installed `@hedgeling/i18n` package:

```sh
node scripts/translate-games.mjs
node scripts/translate-games.mjs --translate
node scripts/check-game-translations.mjs
node scripts/install-game-translations.mjs
```

Set `GEMINI_API_KEY` in the ignored `.hedgeling/local.env`, or use the existing local `GOOGLE_GENERATIVE_AI_API_KEY` in `apps/api/.env`. Credentials are never written to catalogs. The translator resumes missing or changed messages and checkpoints each batch. It does not overwrite existing reviewed site translations. Do not edit the English `source` field when reviewing a draft; edit `text` and change its status to `reviewed`.

## Review brief

- Luna: warm, simple language for a four-year-old. No profanity, sarcasm, frightening language, or complicated slang. Accessibility labels must describe the action clearly.
- Preserve Mia and Luna’s names. Keep cultural object names (Banig, Capiz, Carabao, Parol, Talavera, Alebrije, Zarape); local-script transliteration is appropriate. Translate the descriptive nouns.
- Chess: playful character names and narration; concise and unmistakable controls. Keep the distinction between ordinary checkmate and the Universe deciding a chaos game.
- Preserve interpolation arguments, ICU plural syntax, numbered markup tags, product names and chess coordinates. The validator checks ICU arguments and markup; a fluent speaker still needs to check meaning and naturalness.

## Review build

The web build validates and installs these messages automatically. `install-game-translations.mjs` merges into Hedgeling state and regenerates the served bundle/key map without changing existing site translations or replacing the installed injector. Re-running it after editing a pending game translation updates the review build.

The LLM opponent receives an allowlisted locale and writes new comments in that language. Saved commentary remains in the language in which it was spoken. UI labels, toy names, placement announcements, chess counters and board accessibility labels use the runtime locale. Chessboard orientation and camera-arrow direction remain fixed in Arabic.

For review, check wording and long-text layouts in both games and all languages. Machine validation checks placeholders and markup, not fluency or cultural nuance. These drafts still need language review before being marked verified.

The four required module-template diagnostics in Luna’s `model.ts` (`f{x}{z}`, `edge{side}_{i}`, `edgefront{i}`, `w{wall}{i}`) are internal placement-node IDs, not translatable text. Do not translate them. The physical CSS diagnostic concerns confetti positioning; check it visually under RTL. Potential call-value diagnostics should be checked in-browser before rollout.
