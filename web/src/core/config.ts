/**
 * 应用配置
 */

export const CONFIG = {
  // 性能配置
  performance: {
    enableStats: import.meta.env.NODE_ENV === 'development',
    targetFPS: 60,
    maxShapes: 10000,
  },

  // 画布配置
  canvas: {
    backgroundColor: '#ffffff',
    gridSize: 20,
    showGrid: true,
    minZoom: 0.1,
    maxZoom: 10,
  },

  // 工具配置
  tools: {
    defaultTool: 'select' as const,
    brushMinDistance: 3,
    brushMaxPoints: 100,
  },

  // 命令配置
  commands: {
    maxHistorySize: 100,
  },

  // 协同配置
  collaboration: {
    reconnectAttempts: 5,
    reconnectDelay: 1000,
    heartbeatInterval: 30000,
  },
} as const;

export type Config = typeof CONFIG;
