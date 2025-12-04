export interface WebSocketMessage<T = unknown> {
  type: MessageType;
  userId: string;
  roomId: string;
  timestamp: number;
  data: T;
}

export interface CommandMessage {
  operation: {
    command: SerializedCommand;
  };
}

export interface SerializedCommand {
  type: 'add-shape' | 'remove-shape' | 'move-shape' | 'modify-shape';
  shapeId?: string;
  shape?: SerializedShape;
  x?: number;
  y?: number;
  changes?: Record<string, unknown>;
}

export interface SerializedShape {
  id: string;
  type: string;
  x: number;
  y: number;
  [key: string]: unknown;
}

export type MessageType = 'join' | 'leave' | 'command' | 'cursor' | 'selection' | 'lock' | 'unlock' | 'init_sync';