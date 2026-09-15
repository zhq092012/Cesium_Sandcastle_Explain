/// <reference types="vite/client" />

/**
 * Vite 通过 `import.meta.env` 注入的环境变量类型。
 * `VITE_` 前缀的变量在开发/构建时由 `.env` 文件提供。
 */
interface ImportMetaEnv {
  /** Cesium ion access token，对应 `.env` 中的 `VITE_CESIUM_TOKEN` */
  readonly VITE_CESIUM_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
