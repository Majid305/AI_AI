
/**
 * Fixed: Removed 'vite/client' reference as it was causing resolution errors in this environment.
 * The necessary types for ImportMeta are manually defined below.
 */

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

/**
 * Fixed: Removed manual 'process' variable declaration to avoid redeclaration errors.
 * Instead, we extend the NodeJS namespace which is the standard way to type process.env.
 */
declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_KEY: string;
  }
}
