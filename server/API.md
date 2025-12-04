# API 文档 - web协绘坊

web协绘坊后端 API 文档，包含 WebSocket 实时通信��议和 HTTP REST API。

## 目录

- [概述](#概述)
- [WebSocket API](#websocket-api)
  - [连接](#连接)
  - [消息格式](#消息格式)
  - [客户端消息](#客户端消息)
  - [服务器消息](#服务器消息)
  - [操作类型](#操作类型)
- [HTTP REST API](#http-rest-api)
  - [房间管理](#房间管理)
  - [操作历史](#操作历史)
- [数据模型](#数据模型)
- [错误处理](#错误处理)
- [使用示例](#使用示例)

---

## 概述

### 服务器信息

- **HTTP 服务器**: Koa 3.0
- **WebSocket 服务器**: ws 8.18
- **数据库**: MongoDB 8.0 + Mongoose
- **默认端口**: 3000

### 基础 URL

- **HTTP**: `http://localhost:3000`
- **WebSocket**: `ws://localhost:3000`

---

## WebSocket API

WebSocket 用于实时协同编辑，支持多用户实时同步图形操作。

### 连接

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('✅ Connected to server');
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = () => {
  console.log('🔌 Disconnected from server');
};
```

---

### 消息格式

所有 WebSocket 消息都使用 JSON 格式。

#### 通用结构

```typescript
interface WebSocketMessage {
  type: string;          // 消息类型
  roomId?: string;       // 房间 ID（可选）
  userId?: string;       // 用户 ID（可选）
  timestamp?: number;    // 时间戳（可选）
  data?: any;           // 消息数据（可选）
}
```

---

### 客户端消息

#### 1. 加入房间

用户加入一个房间，开始协同编辑。

**消息类型**: `join`

```typescript
interface JoinMessage {
  type: 'join';
  roomId: string;        // 房间 ID（任意字符串）
  userId: string;        // 用户 ID（唯一标识符）
  data: {
    name: string;        // 用户名称
    color: string;       // 用户颜色（十六进制）
  };
}
```

**示例**:
```javascript
ws.send(JSON.stringify({
  type: 'join',
  roomId: 'my-room-123',
  userId: 'user-alice-001',
  data: {
    name: 'Alice',
    color: '#FF6B6B'
  }
}));
```

**响应**:
- 服务器会发送 `init_sync` 消息（包含房间的所有图形和在线用户）
- 广播 `user_joined` 消息给其他用户

---

#### 2. 操作命令

发送图形操作命令（添加、删除、变换、更新样式）。

**消息类型**: `command`

```typescript
interface CommandMessage {
  type: 'command';
  roomId: string;
  userId: string;
  timestamp: number;     // 操作时间戳
  data: {
    operation: {
      command: CommandData;
    };
  };
}

interface CommandData {
  type: 'add-shape' | 'delete-shape' | 'transform-shape' | 'update-style';
  shape?: any;          // 添加图形时使用
  shapeId?: string;     // 删除/变换图形时使用
  shapeIds?: string[];  // 批量操作时使用
  transform?: any;      // 变换数据
  style?: any;          // 样式数据
}
```

**示例 - 添加图形**:
```javascript
ws.send(JSON.stringify({
  type: 'command',
  roomId: 'my-room-123',
  userId: 'user-alice-001',
  timestamp: Date.now(),
  data: {
    operation: {
      command: {
        type: 'add-shape',
        shape: {
          id: 'shape-001',
          type: 'Rect',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          fill: '#3498db',
          stroke: '#2980b9',
          lineWidth: 2,
          opacity: 1
        }
      }
    }
  }
}));
```

**示例 - 删除图形**:
```javascript
ws.send(JSON.stringify({
  type: 'command',
  roomId: 'my-room-123',
  userId: 'user-alice-001',
  timestamp: Date.now(),
  data: {
    operation: {
      command: {
        type: 'delete-shape',
        shapeIds: ['shape-001', 'shape-002']
      }
    }
  }
}));
```

**示例 - 变换图形**:
```javascript
ws.send(JSON.stringify({
  type: 'command',
  roomId: 'my-room-123',
  userId: 'user-alice-001',
  timestamp: Date.now(),
  data: {
    operation: {
      command: {
        type: 'transform-shape',
        shapeId: 'shape-001',
        transform: {
          x: 150,
          y: 120,
          width: 250,
          height: 180
        }
      }
    }
  }
}));
```

**示例 - 更新样式**:
```javascript
ws.send(JSON.stringify({
  type: 'command',
  roomId: 'my-room-123',
  userId: 'user-alice-001',
  timestamp: Date.now(),
  data: {
    operation: {
      command: {
        type: 'update-style',
        shapeIds: ['shape-001', 'shape-002'],
        style: {
          fill: '#e74c3c',
          stroke: '#c0392b',
          opacity: 0.8
        }
      }
    }
  }
}));
```

**响应**:
- 操作会保存到 MongoDB
- 广播 `command` 消息给其他用户

---

#### 3. 离开房间

用户主动离开房间。

**消息类型**: `leave`

```typescript
interface LeaveMessage {
  type: 'leave';
  roomId: string;
  userId: string;
}
```

**示例**:
```javascript
ws.send(JSON.stringify({
  type: 'leave',
  roomId: 'my-room-123',
  userId: 'user-alice-001'
}));
```

**响应**:
- 广播 `user_left` 消息给其他用户
- 从 MongoDB 中移除用户

---

### 服务器消息

#### 1. 初始化同步

新用户加入房间时，服务器发送房间的完整状态。

**消息类型**: `init_sync`

```typescript
interface InitSyncMessage {
  type: 'init_sync';
  data: {
    shapes: ShapeData[];    // 房间中的所有图形
    users: UserInfo[];      // 在线用户列表
  };
}

interface ShapeData {
  id: string;
  type: string;
  data: any;    // 图形具体数据
}

interface UserInfo {
  userId: string;
  name: string;
  color: string;
  joinedAt: Date;
}
```

**示例**:
```json
{
  "type": "init_sync",
  "data": {
    "shapes": [
      {
        "id": "shape-001",
        "type": "Rect",
        "data": {
          "type": "Rect",
          "id": "shape-001",
          "x": 100,
          "y": 100,
          "width": 200,
          "height": 150,
          "fill": "#3498db",
          "stroke": "#2980b9"
        }
      }
    ],
    "users": [
      {
        "userId": "user-bob-002",
        "name": "Bob",
        "color": "#4ECDC4",
        "joinedAt": "2025-12-04T10:30:00.000Z"
      }
    ]
  }
}
```

---

#### 2. 用户加入通知

新用户加入时，广播给其他用户。

**消息类型**: `user_joined`

```typescript
interface UserJoinedMessage {
  type: 'user_joined';
  data: {
    userId: string;
    name: string;
    color: string;
  };
}
```

**示例**:
```json
{
  "type": "user_joined",
  "data": {
    "userId": "user-alice-001",
    "name": "Alice",
    "color": "#FF6B6B"
  }
}
```

---

#### 3. 用户离开通知

用户离开时，广播给其他用户。

**消息类型**: `user_left`

```typescript
interface UserLeftMessage {
  type: 'user_left';
  data: {
    userId: string;
  };
}
```

**示例**:
```json
{
  "type": "user_left",
  "data": {
    "userId": "user-alice-001"
  }
}
```

---

#### 4. 操作广播

转发用户的操作命令给其他用户。

**消息类型**: `command`

```typescript
interface CommandBroadcast {
  type: 'command';
  userId: string;        // 发起操作的用户
  timestamp: number;
  data: {
    operation: {
      command: CommandData;
    };
  };
}
```

**示例**:
```json
{
  "type": "command",
  "userId": "user-alice-001",
  "timestamp": 1733300000000,
  "data": {
    "operation": {
      "command": {
        "type": "add-shape",
        "shape": {
          "id": "shape-002",
          "type": "Circle",
          "x": 300,
          "y": 200,
          "radius": 50,
          "fill": "#9b59b6"
        }
      }
    }
  }
}
```

---

### 操作类型

#### add-shape（添加图形）

```typescript
{
  type: 'add-shape',
  shape: {
    id: string;
    type: 'Rect' | 'Circle' | 'Line';
    // ... 图形特定属性
  }
}
```

#### delete-shape（删除图形）

```typescript
{
  type: 'delete-shape',
  shapeIds: string[];
}
```

#### transform-shape（变换图形）

```typescript
{
  type: 'transform-shape',
  shapeId: string;
  transform: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    rotation?: number;
  };
}
```

#### update-style（更新样式）

```typescript
{
  type: 'update-style',
  shapeIds: string[];
  style: {
    fill?: string | null;
    stroke?: string | null;
    lineWidth?: number;
    opacity?: number;
  };
}
```

---

## HTTP REST API

### 房间管理

#### 1. 健康检查

检查服务器是否正常运行。

**端点**: `GET /health`

**响应**:
```json
{
  "status": "ok",
  "timestamp": "2025-12-04T10:30:00.000Z",
  "uptime": 3600
}
```

**状态码**:
- `200 OK` - 服务器正常

---

#### 2. 获取房间信息

获取指定房间的详细信息。

**端点**: `GET /api/rooms/:roomId`

**参数**:
- `roomId` (路径参数) - 房间 ID

**响应**:
```json
{
  "roomId": "my-room-123",
  "name": "My Whiteboard",
  "shapes": [
    {
      "id": "shape-001",
      "type": "Rect",
      "data": {
        "x": 100,
        "y": 100,
        "width": 200,
        "height": 150
      }
    }
  ],
  "users": [
    {
      "userId": "user-alice-001",
      "name": "Alice",
      "color": "#FF6B6B",
      "joinedAt": "2025-12-04T10:30:00.000Z"
    }
  ],
  "version": 5,
  "createdAt": "2025-12-04T10:00:00.000Z",
  "updatedAt": "2025-12-04T10:35:00.000Z"
}
```

**状态码**:
- `200 OK` - 成功
- `404 Not Found` - 房间不存在

---

#### 3. 创建房间

创建一个新的房间。

**端点**: `POST /api/rooms`

**请求体**:
```json
{
  "roomId": "my-room-123",
  "name": "My Whiteboard"
}
```

**响应**:
```json
{
  "roomId": "my-room-123",
  "name": "My Whiteboard",
  "shapes": [],
  "users": [],
  "version": 0,
  "createdAt": "2025-12-04T10:00:00.000Z",
  "updatedAt": "2025-12-04T10:00:00.000Z"
}
```

**状态码**:
- `201 Created` - 成功创建
- `400 Bad Request` - 请求参数错误
- `409 Conflict` - 房间已存在

---

### 操作历史

#### 1. 获取房间操作历史

获取指定房间的操作历史记录。

**端点**: `GET /api/rooms/:roomId/operations`

**参数**:
- `roomId` (路径参数) - 房间 ID
- `limit` (查询参数) - 返回数量，默认 50，最大 200
- `offset` (查询参数) - 跳过数量，默认 0

**响应**:
```json
{
  "operations": [
    {
      "_id": "674f1234567890abcdef1234",
      "roomId": "my-room-123",
      "userId": "user-alice-001",
      "type": "add-shape",
      "data": {
        "shape": {
          "id": "shape-001",
          "type": "Rect",
          "x": 100,
          "y": 100
        }
      },
      "timestamp": "2025-12-04T10:30:00.000Z"
    },
    {
      "_id": "674f1234567890abcdef1235",
      "roomId": "my-room-123",
      "userId": "user-bob-002",
      "type": "update-style",
      "data": {
        "shapeIds": ["shape-001"],
        "style": {
          "fill": "#e74c3c"
        }
      },
      "timestamp": "2025-12-04T10:31:00.000Z"
    }
  ],
  "total": 42,
  "limit": 50,
  "offset": 0
}
```

**状态码**:
- `200 OK` - 成功
- `404 Not Found` - 房间不存在

---

## 数据模型

### Room（房间）

```typescript
interface Room {
  _id: ObjectId;
  roomId: string;         // 房间 ID（唯一索引）
  name: string;           // 房间名称
  shapes: ShapeWrapper[]; // 图形列表
  users: User[];          // 在线用户列表
  version: number;        // 版本号（乐观锁）
  createdAt: Date;        // 创建时间
  updatedAt: Date;        // 更新时间
}

interface ShapeWrapper {
  id: string;             // 图形 ID
  type: string;           // 图形类型
  data: any;              // 图形数据（Mixed 类型）
}

interface User {
  userId: string;         // 用户 ID
  name: string;           // 用户名称
  color: string;          // 用户颜色
  joinedAt: Date;         // 加入时间
}
```

---

### Operation（操作历史）

```typescript
interface Operation {
  _id: ObjectId;
  roomId: string;         // 房间 ID（索引）
  userId: string;         // 用户 ID
  type: string;           // 操作类型
  data: any;              // 操作数据（Mixed 类型）
  timestamp: Date;        // 操作时间（索引）
}
```

**索引**:
- `roomId` - 单字段索引
- `timestamp` - 单字段索引
- `{ roomId: 1, timestamp: -1 }` - 组合索引（查询房间操作历史）

---

## 错误处理

### 错误响应格式

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
}
```

### 常见错误码

| HTTP 状态码 | 错误代码 | 说明 |
|------------|---------|------|
| 400 | `BAD_REQUEST` | 请求参数错误 |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `CONFLICT` | 资源冲突（如房间已存在） |
| 500 | `INTERNAL_ERROR` | 服务器内部错误 |

**示例**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Room not found",
    "details": {
      "roomId": "my-room-123"
    }
  }
}
```

---

## 使用示例

### 完整的客户端示例

```typescript
class CollaborationClient {
  private ws: WebSocket | null = null;
  private roomId: string;
  private userId: string;

  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
  }

  // 连接到服务器
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:3000');

      this.ws.onopen = () => {
        console.log('✅ Connected');
        this.joinRoom();
        resolve();
      };

      this.ws.onerror = (error) => {
        console.error('❌ Error:', error);
        reject(error);
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(JSON.parse(event.data));
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected');
        this.reconnect();
      };
    });
  }

  // 加入房间
  private joinRoom(): void {
    this.send({
      type: 'join',
      roomId: this.roomId,
      userId: this.userId,
      data: {
        name: 'User ' + this.userId,
        color: '#' + Math.floor(Math.random() * 16777215).toString(16)
      }
    });
  }

  // 添加图形
  addShape(shape: any): void {
    this.send({
      type: 'command',
      roomId: this.roomId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        operation: {
          command: {
            type: 'add-shape',
            shape
          }
        }
      }
    });
  }

  // 删除图形
  deleteShapes(shapeIds: string[]): void {
    this.send({
      type: 'command',
      roomId: this.roomId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        operation: {
          command: {
            type: 'delete-shape',
            shapeIds
          }
        }
      }
    });
  }

  // 更新样式
  updateStyle(shapeIds: string[], style: any): void {
    this.send({
      type: 'command',
      roomId: this.roomId,
      userId: this.userId,
      timestamp: Date.now(),
      data: {
        operation: {
          command: {
            type: 'update-style',
            shapeIds,
            style
          }
        }
      }
    });
  }

  // 处理消息
  private handleMessage(message: any): void {
    switch (message.type) {
      case 'init_sync':
        console.log('📥 Initial sync:', message.data);
        this.onInitSync(message.data);
        break;

      case 'user_joined':
        console.log('👋 User joined:', message.data);
        this.onUserJoined(message.data);
        break;

      case 'user_left':
        console.log('👋 User left:', message.data);
        this.onUserLeft(message.data);
        break;

      case 'command':
        console.log('🎨 Command:', message);
        this.onCommand(message);
        break;
    }
  }

  // 发送消息
  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket not connected');
    }
  }

  // 重连
  private reconnect(): void {
    setTimeout(() => {
      console.log('🔄 Reconnecting...');
      this.connect();
    }, 3000);
  }

  // 事件处理器（由外部实现）
  onInitSync(data: any): void {}
  onUserJoined(data: any): void {}
  onUserLeft(data: any): void {}
  onCommand(message: any): void {}

  // 断开连接
  disconnect(): void {
    if (this.ws) {
      this.send({
        type: 'leave',
        roomId: this.roomId,
        userId: this.userId
      });
      this.ws.close();
    }
  }
}

// 使用示例
const client = new CollaborationClient('room-123', 'user-001');

client.onInitSync = (data) => {
  console.log('Loaded shapes:', data.shapes);
  console.log('Online users:', data.users);
};

client.onCommand = (message) => {
  const { command } = message.data.operation;
  if (command.type === 'add-shape') {
    console.log('Remote shape added:', command.shape);
  }
};

await client.connect();

// 添加一个矩形
client.addShape({
  id: 'shape-' + Date.now(),
  type: 'Rect',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  fill: '#3498db'
});

// 断开连接
// client.disconnect();
```

---

### HTTP API 使用示例

```typescript
// 创建房间
async function createRoom(roomId: string, name: string) {
  const response = await fetch('http://localhost:3000/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId, name })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
}

// 获取房间信息
async function getRoom(roomId: string) {
  const response = await fetch(`http://localhost:3000/api/rooms/${roomId}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Room not found');
    }
    throw new Error('Failed to get room');
  }

  return await response.json();
}

// 获取操作历史
async function getOperations(roomId: string, limit = 50, offset = 0) {
  const url = new URL(`http://localhost:3000/api/rooms/${roomId}/operations`);
  url.searchParams.set('limit', limit.toString());
  url.searchParams.set('offset', offset.toString());

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error('Failed to get operations');
  }

  return await response.json();
}

// 使用示例
try {
  // 创建新房间
  const room = await createRoom('my-room', 'My Whiteboard');
  console.log('Room created:', room);

  // 获取房间信息
  const roomInfo = await getRoom('my-room');
  console.log('Room info:', roomInfo);

  // 获取操作历史
  const operations = await getOperations('my-room', 10, 0);
  console.log('Operations:', operations);
} catch (error) {
  console.error('Error:', error);
}
```

---

## 相关文档

- [项目总览](../README.md)
- [后端文档](./README.md)
- [前端文档](../web/README.md)
- [架构设计](../docs/架构设计.md)

---

**最后更新**: 2025-12-04
**API 版本**: 1.0.0
**服务器版本**: Node.js 20 LTS
