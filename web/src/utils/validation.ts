/**
 * 数据验证工具
 * 确保前后端数据一致性和安全性
 */

import type { ShapeData, ShapeWrapper, WebSocketMessage } from '../../shared-types';

/**
 * 验证图形数据
 */
export function validateShapeData(data: unknown): data is ShapeData {
  if (!data || typeof data !== 'object') return false;
  
  const shape = data as Record<string, unknown>;
  
  // 必需字段
  if (typeof shape.type !== 'string') return false;
  if (typeof shape.id !== 'string') return false;
  if (typeof shape.x !== 'number') return false;
  if (typeof shape.y !== 'number') return false;
  
  return true;
}

/**
 * 验证图形包装器
 */
export function validateShapeWrapper(data: unknown): data is ShapeWrapper {
  if (!data || typeof data !== 'object') return false;
  
  const wrapper = data as Record<string, unknown>;
  
  if (typeof wrapper.id !== 'string') return false;
  if (typeof wrapper.type !== 'string') return false;
  if (!wrapper.data || typeof wrapper.data !== 'object') return false;
  
  return validateShapeData(wrapper.data);
}

/**
 * 验证 WebSocket 消息
 */
export function validateWebSocketMessage(data: unknown): data is WebSocketMessage {
  if (!data || typeof data !== 'object') return false;
  
  const msg = data as Record<string, unknown>;
  
  if (typeof msg.type !== 'string') return false;
  if (typeof msg.roomId !== 'string') return false;
  if (typeof msg.userId !== 'string') return false;
  if (typeof msg.timestamp !== 'number') return false;
  
  return true;
}

/**
 * 安全解析 JSON
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * 清理 XSS 攻击
 */
export function sanitizeString(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
