/**
 * WebSocket 客户端
 * 实现类似 Figma 的实时协同编辑
 *
 * 面试考点：
 * 1. 如何实现实时协同？—— WebSocket + 操作转换（OT）或 CRDT
 * 2. 如何处理冲突？—— 操作序列化 + 时间戳 + 版本号
 * 3. 如何优化性能？—— 节流、批量发送、增量更新
 * 4. 如何保证可靠性？—— 心跳检测、断线重连、消息确认
 */

import type { Shape } from './shapes';
import { EventEmitter } from './EventEmitter';

/** 消息类型 */
export enum MessageType {
  /** 加入房间 */
  JOIN_ROOM = 'join_room',
  /** 离开房间 */
  LEAVE_ROOM = 'leave_room',
  /** 添加图形 */
  ADD_SHAPE = 'add_shape',
  /** 更新图形 */
  UPDATE_SHAPE = 'update_shape',
  /** 删除图形 */
  DELETE_SHAPE = 'delete_shape',
  /** 光标移动 */
  CURSOR_MOVE = 'cursor_move',
  /** 选中变化 */
  SELECTION_CHANGE = 'selection_change',
  /** 心跳 */
  PING = 'ping',
  /** 心跳响应 */
  PONG = 'pong',
}

/** 用户信息 */
export interface User {
  id: string;
  name: string;
  color: string; // 用户标识颜色
  avatar?: string;
}

/** 光标位置 */
export interface CursorPosition {
  x: number;
  y: number;
  userId: string;
}

/** 消息基类 */
export interface Message {
  type: MessageType;
  userId: string;
  timestamp: number;
  roomId: string;
}

/** 加入房间消息 */
export interface JoinRoomMessage extends Message {
  type: MessageType.JOIN_ROOM;
  user: User;
}

/** 添加图形消息 */
export interface AddShapeMessage extends Message {
  type: MessageType.ADD_SHAPE;
  shape: any; // Shape 的 JSON 表示
}

/** 更新图形消息 */
export interface UpdateShapeMessage extends Message {
  type: MessageType.UPDATE_SHAPE;
  shapeId: string;
  changes: Partial<any>; // 只传递变化的字段
}

/** 删除图形消息 */
export interface DeleteShapeMessage extends Message {
  type: MessageType.DELETE_SHAPE;
  shapeId: string;
}

/** 光标移动消息 */
export interface CursorMoveMessage extends Message {
  type: MessageType.CURSOR_MOVE;
  position: { x: number; y: number };
}

/** Socket 配置 */
export interface SocketOptions {
  /** WebSocket 服务器地址 */
  url: string;
  /** 自动重连 */
  autoReconnect?: boolean;
  /** 重连间隔（毫秒） */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnectAttempts?: number;
  /** 心跳间隔（毫秒） */
  heartbeatInterval?: number;
}

/** Socket 事件 */
export interface SocketEvents {
  /** 连接成功 */
  connected: [];
  /** 断开连接 */
  disconnected: [];
  /** 连接错误 */
  error: [Error];
  /** 用户加入 */
  userJoined: [User];
  /** 用户离开 */
  userLeft: [string]; // userId
  /** 图形添加 */
  shapeAdded: [any]; // shape JSON
  /** 图形更新 */
  shapeUpdated: [string, Partial<any>]; // shapeId, changes
  /** 图形删除 */
  shapeDeleted: [string]; // shapeId
  /** 光标移动 */
  cursorMoved: [CursorPosition];
  /** 房间状态同步 */
  roomSync: [any]; // 完整的房间状态
  /** 索引签名 */
  [key: string]: any[];
}

/**
 * WebSocket 客户端
 */
export class SocketClient extends EventEmitter<SocketEvents> {
  private ws: WebSocket | null = null;
  private options: Required<SocketOptions>;
  private reconnectAttempts = 0;
  private heartbeatTimer: number | null = null;
  private reconnectTimer: number | null = null;

  /** 当前用户 */
  private currentUser: User | null = null;

  /** 当前房间 */
  private currentRoomId: string | null = null;

  /** 是否正在连接 */
  private connecting = false;

  /** 消息队列（离线时缓存） */
  private messageQueue: Message[] = [];

  constructor(options: SocketOptions) {
    super();

    this.options = {
      url: options.url,
      autoReconnect: options.autoReconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
      heartbeatInterval: options.heartbeatInterval ?? 30000,
    };
  }

  /**
   * 连接到 WebSocket 服务器
   */
  connect(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.connecting) {
        reject(new Error('Already connecting'));
        return;
      }

      this.connecting = true;
      this.currentUser = user;

      try {
        this.ws = new WebSocket(this.options.url);

        this.ws.onopen = () => {
          console.log('[SocketClient] Connected');
          this.connecting = false;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.flushMessageQueue();
          this.emit('connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[SocketClient] Error:', error);
          this.emit('error', new Error('WebSocket error'));
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('[SocketClient] Disconnected');
          this.connecting = false;
          this.stopHeartbeat();
          this.emit('disconnected');

          if (this.options.autoReconnect) {
            this.scheduleReconnect();
          }
        };
      } catch (error) {
        this.connecting = false;
        reject(error);
      }
    });
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.currentRoomId = null;
  }

  /**
   * 加入房间
   */
  joinRoom(roomId: string): void {
    if (!this.currentUser) {
      throw new Error('User not set');
    }

    this.currentRoomId = roomId;

    const message: JoinRoomMessage = {
      type: MessageType.JOIN_ROOM,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      roomId,
      user: this.currentUser,
    };

    this.send(message);
  }

  /**
   * 离开房间
   */
  leaveRoom(): void {
    if (!this.currentRoomId || !this.currentUser) return;

    const message: Message = {
      type: MessageType.LEAVE_ROOM,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      roomId: this.currentRoomId,
    };

    this.send(message);
    this.currentRoomId = null;
  }

  /**
   * 发送添加图形消息
   */
  addShape(shape: Shape): void {
    if (!this.currentRoomId || !this.currentUser) return;

    const message: AddShapeMessage = {
      type: MessageType.ADD_SHAPE,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      roomId: this.currentRoomId,
      shape: shape.toJSON(),
    };

    this.send(message);
  }

  /**
   * 发送更新图形消息
   */
  updateShape(shapeId: string, changes: Partial<any>): void {
    if (!this.currentRoomId || !this.currentUser) return;

    const message: UpdateShapeMessage = {
      type: MessageType.UPDATE_SHAPE,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      roomId: this.currentRoomId,
      shapeId,
      changes,
    };

    this.send(message);
  }

  /**
   * 发送删除图形消息
   */
  deleteShape(shapeId: string): void {
    if (!this.currentRoomId || !this.currentUser) return;

    const message: DeleteShapeMessage = {
      type: MessageType.DELETE_SHAPE,
      userId: this.currentUser.id,
      timestamp: Date.now(),
      roomId: this.currentRoomId,
      shapeId,
    };

    this.send(message);
  }

  /**
   * 发送光标移动消息（节流）
   */
  private lastCursorSendTime = 0;
  private cursorThrottle = 50; // 50ms

  moveCursor(x: number, y: number): void {
    if (!this.currentRoomId || !this.currentUser) return;

    const now = Date.now();
    if (now - this.lastCursorSendTime < this.cursorThrottle) {
      return; // 节流
    }

    this.lastCursorSendTime = now;

    const message: CursorMoveMessage = {
      type: MessageType.CURSOR_MOVE,
      userId: this.currentUser.id,
      timestamp: now,
      roomId: this.currentRoomId,
      position: { x, y },
    };

    this.send(message);
  }

  /**
   * 发送消息
   */
  private send(message: Message): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      // 离线时加入队列
      this.messageQueue.push(message);
      return;
    }

    try {
      this.ws.send(JSON.stringify(message));
    } catch (error) {
      console.error('[SocketClient] Send error:', error);
      this.messageQueue.push(message);
    }
  }

  /**
   * 处理收到的消息
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as Message;

      // 忽略自己发送的消息
      if (message.userId === this.currentUser?.id) {
        return;
      }

      switch (message.type) {
        case MessageType.JOIN_ROOM: {
          const msg = message as JoinRoomMessage;
          this.emit('userJoined', msg.user);
          break;
        }

        case MessageType.LEAVE_ROOM: {
          this.emit('userLeft', message.userId);
          break;
        }

        case MessageType.ADD_SHAPE: {
          const msg = message as AddShapeMessage;
          this.emit('shapeAdded', msg.shape);
          break;
        }

        case MessageType.UPDATE_SHAPE: {
          const msg = message as UpdateShapeMessage;
          this.emit('shapeUpdated', msg.shapeId, msg.changes);
          break;
        }

        case MessageType.DELETE_SHAPE: {
          const msg = message as DeleteShapeMessage;
          this.emit('shapeDeleted', msg.shapeId);
          break;
        }

        case MessageType.CURSOR_MOVE: {
          const msg = message as CursorMoveMessage;
          this.emit('cursorMoved', {
            ...msg.position,
            userId: msg.userId,
          });
          break;
        }

        case MessageType.PONG: {
          // 心跳响应
          break;
        }

        default:
          console.warn('[SocketClient] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[SocketClient] Message parse error:', error);
    }
  }

  /**
   * 刷新消息队列
   */
  private flushMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`[SocketClient] Flushing ${this.messageQueue.length} messages`);

    const queue = [...this.messageQueue];
    this.messageQueue = [];

    queue.forEach(message => this.send(message));
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN && this.currentUser) {
        const message: Message = {
          type: MessageType.PING,
          userId: this.currentUser.id,
          timestamp: Date.now(),
          roomId: this.currentRoomId || '',
        };
        this.send(message);
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 调度重连
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('[SocketClient] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;

    console.log(
      `[SocketClient] Reconnecting in ${this.options.reconnectInterval}ms ` +
      `(attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})`
    );

    this.reconnectTimer = window.setTimeout(() => {
      if (this.currentUser) {
        this.connect(this.currentUser)
          .then(() => {
            if (this.currentRoomId) {
              this.joinRoom(this.currentRoomId);
            }
          })
          .catch(error => {
            console.error('[SocketClient] Reconnect failed:', error);
          });
      }
    }, this.options.reconnectInterval);
  }

  /**
   * 清除重连定时器
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 获取连接状态
   */
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * 获取当前用户
   */
  get user(): User | null {
    return this.currentUser;
  }

  /**
   * 获取当前房间 ID
   */
  get roomId(): string | null {
    return this.currentRoomId;
  }
}
