/** Endpoint configuration. These are public client-side URLs, not secrets:
 * the browser calls them directly and VITE_ values are inlined into the bundle.
 * Overrides come from apps/web/.env (see .env.example).
 */
export const quantumUrl = import.meta.env.VITE_QUANTUM_API_URL || 'https://5o1vmqmw04.execute-api.eu-north-1.amazonaws.com/oracle';
export const narrationUrl = `${(import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8787').replace(/\/+$/, '')}/schrodingers-possum/v1/narrate`;
