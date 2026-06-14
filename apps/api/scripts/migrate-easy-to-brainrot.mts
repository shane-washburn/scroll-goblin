/**
 * One-off migration: move all Easy Button Redis data into the Brainrot Button
 * namespace, then delete the old keys.
 *
 * Affected keys:
 *   easy-button:clip:<id>     -> brainrot-button:clip:<id>     (TTL preserved)
 *   easy-button:rate:<ip>:<n> -> brainrot-button:rate:<ip>:<n> (TTL preserved)
 *   stats:easy-button:<metric> -> stats:brainrot-button:<metric> (counts merged)
 *
 * Run once, manually, against the target Upstash database (reads
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN from apps/api/.env):
 *   pnpm --filter @scroll-goblin/api migrate:brainrot
 *   pnpm --filter @scroll-goblin/api migrate:brainrot -- --dry-run
 *
 * Safe to re-run: stats counters are added into the destination and the source
 * keys are deleted, so once the easy-button:* keys are gone it is a no-op.
 */
import "dotenv/config";
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error(
    "Missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN — nothing to migrate."
  );
  process.exit(1);
}

const redis = new Redis({ url, token });
const DRY_RUN = process.argv.includes("--dry-run");

const OLD = "easy-button";
const NEW = "brainrot-button";

/** Map an old key to its new namespace (handles both bare and stats: prefixes). */
function toNewKey(oldKey: string): string {
  if (oldKey.startsWith(`${OLD}:`)) return `${NEW}:${oldKey.slice(OLD.length + 1)}`;
  if (oldKey.startsWith(`stats:${OLD}:`)) {
    return `stats:${NEW}:${oldKey.slice(`stats:${OLD}:`.length)}`;
  }
  return oldKey;
}

async function scanKeys(pattern: string): Promise<string[]> {
  const keys: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, { match: pattern, count: 200 });
    cursor = String(next);
    keys.push(...batch);
  } while (cursor !== "0");
  return keys;
}

/** Clips + rate buckets: opaque values, RENAME moves them and keeps the TTL. */
async function migrateOpaque(pattern: string): Promise<number> {
  const keys = await scanKeys(pattern);
  for (const oldKey of keys) {
    const newKey = toNewKey(oldKey);
    console.log(`${DRY_RUN ? "[dry] " : ""}RENAME ${oldKey} -> ${newKey}`);
    if (DRY_RUN) continue;
    try {
      await redis.rename(oldKey, newKey);
    } catch (err) {
      console.warn(`  skipped ${oldKey}: ${(err as Error).message}`);
    }
  }
  return keys.length;
}

/** Stats counters: add the old total into the destination, then drop the old key. */
async function migrateCounters(pattern: string): Promise<number> {
  const keys = await scanKeys(pattern);
  for (const oldKey of keys) {
    const newKey = toNewKey(oldKey);
    const value = Number((await redis.get<number>(oldKey)) ?? 0);
    console.log(`${DRY_RUN ? "[dry] " : ""}INCRBY ${newKey} += ${value} (from ${oldKey})`);
    if (DRY_RUN) continue;
    if (value !== 0) await redis.incrby(newKey, value);
    await redis.del(oldKey);
  }
  return keys.length;
}

async function main(): Promise<void> {
  console.log(
    DRY_RUN
      ? "DRY RUN — scanning only, no writes.\n"
      : "Migrating Easy Button -> Brainrot Button...\n"
  );
  const clips = await migrateOpaque(`${OLD}:clip:*`);
  const rate = await migrateOpaque(`${OLD}:rate:*`);
  const stats = await migrateCounters(`stats:${OLD}:*`);
  console.log(
    `\nDone. Processed ${clips} clip(s), ${rate} rate bucket(s), ${stats} stat counter(s).`
  );
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
