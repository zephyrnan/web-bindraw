/**
 * 共享类型定义
 * 前后端统一使用，确保数据结构一致
 */

// ==================== 图形相关 ====================

export interface ShapeStyle {
  fillStyle?: string | null;
  strokeStyle?: string | null;
  lineWidth?: number;
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  lineDash?: number[];
}

export interface BaseShapeData {
  type: string;
  id: string;
  name: string;
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  style: ShapeStyle;
  visible: boolean;
  locked: boolean;
  zIndex: number;
}

export interface RectData extends BaseShapeData {
  type: 'Rect';
  width: number;
  height: number;
  cornerRadius: number;
}

export interface CircleData extends BaseShapeData {
  type: 'Circle';
  radius: number;
}

export interface LineData extends BaseShapeData {
  type: 'Line';
  points: Array<{ x: number; y: number }>;
  smooth?: boolean;
  smoothAlgorithm?: 'catmullRom' | 'bezier' | 'simple';
}

export interface TextData extends BaseShapeData {
  type: 'Text';
  content: string;
  fontSize: number;
  fontFamily: string;
}

export type ShapeData = RectData | CircleData | LineData | TextData;

// ==================== 数据库存储结构 ====================

export interface ShapeWrapper {
  id: string;
  type: string;
  data: ShapeData;
}

// ==================== WebSocket 消息 ====================

export interface CommandMessage {
  type: 'add-shape' | 'remove-shape' | 'move-shape' | 'modify-shape';
  shape?: ShapeData;
  shapeId?: string;
  [key: string]: any;
}

export interface OperationData {
  command: CommandMessage;
}

export interface WebSocketMessage {
  type: 'join' | 'leave' | 'command' | 'cursor' | 'selection' | 'init_sync';
  roomId: string;
  userId: string;
  timestamp: number;
  data?: any;
}

// ==================== 房间相关 ====================

export interface UserData {
  userId: string;
  name: string;
  color: string;
  joinedAt?: Date;
}

export interface RoomData {
  roomId: string;
  name: string;
  shapes: ShapeWrapper[];
  users: UserData[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== API 响应 ====================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
