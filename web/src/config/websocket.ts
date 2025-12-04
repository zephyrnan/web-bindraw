/**
 * WebSocket 配置
 * 从环境变量读取，支持开发/生产环境切换
 */
export const WEBSOCKET_CONFIG = {
  url: import.meta.env.VITE_WS_URL || 'ws://localhost:3000',
  reconnectInterval: 3000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
  pingInterval: 25000,
  pongTimeout: 5000,
} as const;

/**
 * 验证 WebSocket URL
 */
export function validateWebSocketUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
  } catch {
    return false;
  }
}

/**
 * 获取 WebSocket URL（带验证）
 */
export function getWebSocketUrl(): string {
  const url = WEBSOCKET_CONFIG.url;
  
  if (!validateWebSocketUrl(url)) {
    console.warn(`Invalid WebSocket URL: ${url}, falling back to default`);
    return 'ws://localhost:3000';
  }
  
  return url;
}