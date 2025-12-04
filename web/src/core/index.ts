/**
 * 核心模块导出
 */

// 数学库
export * from './math';

// 图形
export * from './shapes';

// 工具
export * from './tools';
export { Tool, type ToolEvent } from './tools/Tool';
export { ToolManager, type ToolType } from './tools/ToolManager';

// 命令
export * from './commands';

// 核心类
export { Editor, type EditorOptions } from './Editor';
export { RenderEngine, type RenderEngineOptions } from './RenderEngine';
export { Scene, type SceneOptions } from './Scene';
export { EventEmitter } from './EventEmitter';
export { ErrorHandler } from './ErrorHandler';
export { CONFIG, type Config } from './config';

// 协同
export {
  SocketClient,
  type SocketOptions,
  type User,
  type CursorPosition,
  MessageType
} from './SocketClient';

// 兼容旧的导出（如果有其他文件使用）
export { Canvas, type CanvasOptions } from './Canvas';
export { Renderer, type RendererOptions } from './Renderer';
export { SelectionManager } from './SelectionManager';

// 变换系统
export { TransformHandle, HandleType, type HandleConfig, type TransformResult } from './TransformHandle';

// 性能优化
export { QuadTree } from './QuadTree';
