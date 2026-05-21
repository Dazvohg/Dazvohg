/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PRICES_WORKER_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
