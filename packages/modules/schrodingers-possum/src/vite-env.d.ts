/** Minimal ambient types for the Vite features this module uses, so it
 * typechecks standalone (vite/client is only installed in apps/web). */
interface ImportMetaEnv {
  readonly VITE_QUANTUM_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
declare module '*.css';
