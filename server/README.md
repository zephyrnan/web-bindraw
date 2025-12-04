# Whiteboard Collaboration Server

> Node.js + MongoDB + WebSocket 后端服务

## 🚀 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并修改配置：

```bash
cp .env.example .env
```

### 3. 启动 MongoDB

**本地 MongoDB:**
```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

**或使用 MongoDB Atlas（云数据库）:**
1. 注册 https://www.mongodb.com/cloud/atlas
2. 创建免费集群
3. 获取连接字符串
4. 更新 `.env` 中的 `MONGODB_URI`

### 4. 启动服务器

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

服务器将在 `http://localhost:3000` 启动

## 📡 API 接口

### HTTP API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/health` | 健康检查 |
| GET | `/api/rooms/:roomId` | 获取房间信息 |
| POST | `/api/rooms` | 创建房间 |
| GET | `/api/rooms/:roomId/operations` | 获取操作历史 |

### WebSocket 消息

**客户端 → 服务器:**
- `join` - 加入房间
- `leave` - 离开房间
- `command` - 操作命令（添加/更新/删除图形）
- `cursor` - 光标移动
- `selection` - 选择变化
- `lock/unlock` - 图形锁定

**服务器 → 客户端:**
- `init_sync` - 初始化同步（房间状态）
- `join` - 用户加入通知
- `leave` - 用户离开通知
- `command` - 操作广播
- `cursor` - 光标位置广播
- `selection` - 选择状态广播

## 📁 项目结构

```
server/
├── src/
│   ├── config/          # 配置文件
│   │   └── database.js  # 数据库连接
│   ├── models/          # 数据模型
│   │   ├── Room.js      # 房间模型
│   │   └── Operation.js # 操作历史模型
│   ├── routes/          # 路由
│   │   └── rooms.js     # 房间路由
│   ├── services/        # 服务层
│   │   ├── RoomService.js      # 房间服务
│   │   └── WebSocketService.js # WebSocket 服务
│   └── index.js         # 入口文件
├── .env                 # 环境变量
├── .env.example         # 环境变量示例
├── package.json         # 依赖配置
└── README.md           # 说明文档
```

## 🗄️ 数据模型

### Room（房间）

```javascript
{
  roomId: String,        // 房间 ID
  name: String,          // 房间名称
  shapes: [{             // 图形列表
    id: String,
    type: String,
    data: Object
  }],
  users: [{              // 用户列表
    userId: String,
    name: String,
    color: String,
    joinedAt: Date
  }],
  version: Number,       // 版本号
  createdAt: Date,
  updatedAt: Date
}
```

### Operation（操作历史）

```javascript
{
  roomId: String,        // 房间 ID
  userId: String,        // 用户 ID
  type: String,          // 操作类型
  data: Object,          // 操作数据
  timestamp: Date        // 时间戳
}
```

## 🔧 开发指南

### 添加新的 API 接口

1. 在 `src/routes/` 创建路由文件
2. 在 `src/index.js` 中注册路由

### 添加新的 WebSocket 消息类型

在 `src/services/WebSocketService.js` 的 `handleMessage` 方法中添加新的 case

### 数据库操作

使用 `RoomService` 进行数据库操作，避免直接操作模型

## 🐛 故障排除

### MongoDB 连接失败

1. 确认 MongoDB 服务已启动
2. 检查 `.env` 中的连接字符串
3. 检查防火墙设置

### WebSocket 连接失败

1. 确认端口未被占用
2. 检查 CORS 配置
3. 查看浏览器控制台错误

## 📝 环境变量说明

| 变量 | 说明 | 默认值 |
|------|------|--------|
| PORT | HTTP 服务器端口 | 3000 |
| NODE_ENV | 运行环境 | development |
| MONGODB_URI | MongoDB 连接字符串 | mongodb://localhost:27017/whiteboard |
| CORS_ORIGIN | CORS 允许的源 | http://localhost:5173 |

## 📄 License

MIT
