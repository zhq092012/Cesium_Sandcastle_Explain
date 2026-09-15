/**
 * Monaco Editor 本地加载配置。
 *
 * 默认情况下 `@monaco-editor/react` 会从 jsDelivr CDN 拉取 `loader.js`；
 * 在国内网络环境下 CDN 经常不可用，导致编辑器初始化失败。
 * 此处改为使用 `node_modules/monaco-editor` 本地包，并配置 Vite worker。
 */
import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

/**
 * 按语言标签返回对应的 Monaco Web Worker 实例。
 *
 * @param _moduleId - Monaco 内部模块 ID（未使用）。
 * @param label - 语言标签，如 `typescript`、`json`。
 * @returns 对应语言的 Worker 实例。
 */
function createMonacoWorker(_moduleId: string, label: string): Worker {
  if (label === 'json') {
    return new jsonWorker();
  }
  if (label === 'css' || label === 'scss' || label === 'less') {
    return new cssWorker();
  }
  if (label === 'html' || label === 'handlebars' || label === 'razor') {
    return new htmlWorker();
  }
  if (label === 'typescript' || label === 'javascript') {
    return new tsWorker();
  }
  return new editorWorker();
}

/** 供 Monaco 运行时解析 Worker 脚本的全局环境配置。 */
self.MonacoEnvironment = {
  getWorker: createMonacoWorker,
};

/** 使用本地 npm 包而非 CDN 加载 Monaco。 */
loader.config({ monaco });
