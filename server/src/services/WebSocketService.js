import { WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { RoomService } from './RoomService.js';

export class WebSocketService {
  constructor(server) {
    this.wss = new WebSocketServer({ server });
    this.clients = new Map(); // ws -> { userId, roomId, user }
    this.rooms = new Map(); // roomId -> Set<ws>
    
    this.setupWebSocket();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws) => {
      const sessionId = uuidv4();
      console.log(`[WS] Client connected: ${sessionId}`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('[WS] Message error:', error);
        }
      });

      ws.on('close', async () => {
        await this.handleDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('[WS] Error:', error);
      });
    });

    console.log('✅ WebSocket server started');
  }

  async handleMessage(ws, message) {
    const { type, roomId, userId, data } = message;

    switch (type) {
      case 'join':
        await this.handleJoin(ws, roomId, userId, data);
        break;

      case 'leave':
        await this.handleLeave(ws, roomId, userId);
        break;

      case 'command':
        await this.handleCommand(ws, roomId, userId, data);
        break;

      case 'cursor':
        this.broadcast(roomId, message, ws);
        break;

      case 'selection':
        this.broadcast(roomId, message, ws);
        break;

      case 'lock':
      case 'unlock':
        this.broadcast(roomId, message, ws);
        break;

      default:
        console.warn('[WS] Unknown message type:', type);
    }
  }

  async handleJoin(ws, roomId, userId, userData) {
    // 保存客户端信息
    this.clients.set(ws, { userId, roomId, user: userData });

    // 添加到房间
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId).add(ws);

    // 保存到数据库
    await RoomService.addUser(roomId, { userId, ...userData });

    // 获取房间完整状态
    const room = await RoomService.getRoom(roomId);
    console.log(`[WS] Room ${roomId} has ${room.shapes.length} shapes`);

    // 获取房间内其他用户
    const users = Array.from(this.rooms.get(roomId))
      .filter(client => client !== ws)
      .map(client => this.clients.get(client)?.user)
      .filter(Boolean);

    // 发送初始化数据给新用户
    this.send(ws, {
      type: 'init_sync',
      timestamp: Date.now(),
      data: {
        users,
        canvas: {
          shapes: room.shapes,
          version: room.version
        }
      }
    });

    // 广播新用户加入
    this.broadcast(roomId, {
      type: 'join',
      userId,
      timestamp: Date.now(),
      data: userData
    }, ws);

    console.log(`[WS] User ${userId} joined room ${roomId}`);
  }

  async handleLeave(ws, roomId, userId) {
    // 从房间移除
    if (this.rooms.has(roomId)) {
      this.rooms.get(roomId).delete(ws);
      if (this.rooms.get(roomId).size === 0) {
        this.rooms.delete(roomId);
      }
    }

    // 从数据库移除
    await RoomService.removeUser(roomId, userId);

    // 广播用户离开
    this.broadcast(roomId, {
      type: 'leave',
      userId,
      timestamp: Date.now()
    });

    this.clients.delete(ws);
    console.log(`[WS] User ${userId} left room ${roomId}`);
  }

  async handleCommand(ws, roomId, userId, commandData) {
    const { operation } = commandData;
    if (!operation?.command) {
      console.warn('[WS] No command in operation:', commandData);
      return;
    }

    const cmd = operation.command;
    console.log(`[WS] Processing command: ${cmd.type} in room ${roomId}`);

    // 保存到数据库
    try {
      switch (cmd.type) {
        case 'add-shape':
          if (cmd.shape) {
            await RoomService.addShape(roomId, {
              id: cmd.shape.id,
              type: cmd.shape.type,
              data: cmd.shape
            });
            console.log(`[WS] ✅ Shape saved: ${cmd.shape.id}`);
          }
          break;

        case 'delete-shape':
        case 'remove-shape':
          await RoomService.deleteShape(roomId, cmd.shapeId);
          console.log(`[WS] ✅ Shape deleted: ${cmd.shapeId}`);
          break;

        case 'update-shape':
        case 'move-shape':
        case 'resize-shape':
        case 'rotate-shape':
          await RoomService.updateShape(roomId, cmd.shapeId, cmd);
          console.log(`[WS] ✅ Shape updated: ${cmd.shapeId}`);
          break;

        default:
          console.warn(`[WS] Unknown command type: ${cmd.type}`);
      }

      // 保存操作历史
      await RoomService.saveOperation(roomId, userId, cmd.type, cmd);
    } catch (error) {
      console.error('[WS] ❌ Command error:', error.message);
      console.error('[WS] Command data:', JSON.stringify(cmd, null, 2));
    }

    // 广播给所有用户（包括发送者）
    // 前端会通过 userId 判断是否忽略自己的消息
    this.broadcast(roomId, {
      type: 'command',
      userId,
      timestamp: Date.now(),
      data: commandData
    });
  }

  async handleDisconnect(ws) {
    const client = this.clients.get(ws);
    if (client) {
      await this.handleLeave(ws, client.roomId, client.userId);
    }
  }

  // 广播给房间内所有用户
  // excludeWs: 对于 command 消息传 null（广播给所有人），其他消息可以排除发送者
  broadcast(roomId, message, excludeWs = null) {
    if (!this.rooms.has(roomId)) return;

    const msgString = JSON.stringify(message);
    this.rooms.get(roomId).forEach((client) => {
      if (client !== excludeWs && client.readyState === 1) {
        client.send(msgString);
      }
    });
  }

  send(ws, message) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(message));
    }
  }
}
