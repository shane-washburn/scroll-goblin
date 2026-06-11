/**
 * URL-encoded share snapshots.
 *
 * A module serializes its state into a versioned payload, encodes it into a
 * `?s=` query param, and shares the resulting URL. On load, the recipient's
 * module consumes the snapshot exactly once — the param is immediately
 * stripped from the address bar so a refresh (or any fresh navigation to the
 * module) starts from a blank state.
 */

const SHARE_PARAM = "s";

/** Wire format: every snapshot carries the module id and a schema version. */
export interface ShareEnvelope<T> {
  /** Module id the snapshot belongs to (guards against cross-module links). */
  m: string;
  /** Module-defined schema version; bump when the state shape changes. */
  v: number;
  /** The module's serialized state. */
  d: T;
}

/** Unicode-safe base64url encode. */
function encode(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Unicode-safe base64url decode; returns null on malformed input. */
function decode(blob: string): string | null {
  try {
    const b64 = blob.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

/**
 * Build a shareable URL for the current page embedding the given state.
 * Returns null if the encoded URL would be too long to share reliably.
 */
export function buildShareUrl<T>(
  moduleId: string,
  version: number,
  state: T,
  maxLength = 8000
): string | null {
  const envelope: ShareEnvelope<T> = { m: moduleId, v: version, d: state };
  const blob = encode(JSON.stringify(envelope));
  const url = new URL(window.location.href);
  url.search = "";
  url.searchParams.set(SHARE_PARAM, blob);
  const href = url.toString();
  return href.length <= maxLength ? href : null;
}

/**
 * Read and consume a share snapshot from the current URL.
 *
 * If a valid snapshot for this module (and version) is present, it is
 * returned AND the share param is removed from the address bar via
 * `history.replaceState` — so reloading or re-navigating yields a blank
 * module. Returns null when there is no (valid) snapshot.
 *
 * Call once during initial render, e.g. inside a `useState` initializer:
 * `const [snapshot] = useState(() => consumeShareSnapshot<MyState>("my-module", 1));`
 */
export function consumeShareSnapshot<T>(
  moduleId: string,
  version: number
): T | null {
  const url = new URL(window.location.href);
  const blob = url.searchParams.get(SHARE_PARAM);
  if (!blob) return null;

  // Strip the param regardless of validity so broken links also self-clean.
  url.searchParams.delete(SHARE_PARAM);
  window.history.replaceState(null, "", url.toString());

  const json = decode(blob);
  if (!json) return null;

  try {
    const envelope = JSON.parse(json) as ShareEnvelope<T>;
    if (envelope.m !== moduleId || envelope.v !== version) return null;
    return envelope.d;
  } catch {
    return null;
  }
}
