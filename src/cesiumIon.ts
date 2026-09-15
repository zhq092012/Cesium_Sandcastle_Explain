import * as Cesium from 'cesium';

/** localStorage 中保存用户自定义 Cesium ion token 的键名 */
export const CESIUM_ION_TOKEN_STORAGE_KEY = 'cesium_ion_token';

/**
 * 从 Vite 环境变量中读取 `.env` 配置的 Cesium ion token。
 *
 * @returns 去除首尾空白后的 token；未配置或为空字符串时返回空字符串。
 */
export function getCesiumIonTokenFromEnv(): string {
  const fromEnv = import.meta.env.VITE_CESIUM_TOKEN;
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return '';
}

/**
 * 获取当前生效的 Cesium ion access token。
 *
 * 优先级：localStorage（用户在设置面板中保存的值） > `.env` 中的 `VITE_CESIUM_TOKEN`。
 *
 * @returns 生效的 token 字符串；两者均未配置时返回空字符串。
 */
export function getCesiumIonToken(): string {
  const stored = localStorage.getItem(CESIUM_ION_TOKEN_STORAGE_KEY);
  if (stored && stored.trim().length > 0) {
    return stored.trim();
  }
  return getCesiumIonTokenFromEnv();
}

/**
 * 将 Cesium ion access token 写入 `Cesium.Ion.defaultAccessToken`。
 *
 * 传入空字符串或仅空白时**不会**覆盖 Cesium 内置默认 token，
 * 避免 `fromIonAssetId` 等依赖 ion 资源的 API 因空 token 而失败。
 *
 * @param token - 待应用的 token；省略时自动调用 {@link getCesiumIonToken} 解析。
 */
export function applyCesiumIonToken(token?: string): void {
  const effective =
    token !== undefined ? token.trim() : getCesiumIonToken();

  if (effective.length > 0) {
    Cesium.Ion.defaultAccessToken = effective;
  }
}

/**
 * 应用启动时初始化 Cesium ion token。
 *
 * 应在 `main.tsx` 中、任何 `Cesium.Viewer` 或 `fromIonAssetId` 调用之前执行，
 * 确保示例组件加载时 token 已就绪。
 */
export function initCesiumIonToken(): void {
  applyCesiumIonToken();
}

/**
 * 探测当前环境是否能访问 Cesium ion API。
 *
 * 用于在 UI 中提示网络或 token 问题；连接被重置（国内常见）或 DNS 失败时返回 `false`。
 *
 * @param timeoutMs - 请求超时毫秒数，默认 8000。
 * @returns 能收到 HTTP 响应（含 401/403）时为 `true`；网络层失败时为 `false`。
 */
export async function checkCesiumIonConnectivity(
  timeoutMs = 8000,
): Promise<boolean> {
  const token = getCesiumIonToken();
  const url = new URL('https://api.cesium.com/v1/assets/1/endpoint');
  if (token.length > 0) {
    url.searchParams.set('access_token', token);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 任意 HTTP 状态码都说明网络可达；仅连接层错误才视为不可达
    return response.status > 0;
  } catch {
    return false;
  }
}
