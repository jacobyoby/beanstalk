/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_OPENFDA_KEY?: string
}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
