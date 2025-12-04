# 后端快速配置指南

## 📦 安装步骤

### 1. 安装 Node.js

确保安装了 Node.js 20 或更高版本：

```bash
node --version  # 应该显示 v20.x.x 或更高
```

如果没有安装，请访问 https://nodejs.org/

### 2. 安装 MongoDB

#### Windows

**方法 1: 官方安装包**
1. 访问 https://www.mongodb.com/try/download/community
2. 下载 Windows 版本
3. 运行安装程序
4. 选择 "Complete" 安装
5. 勾选 "Install MongoDB as a Service"

**方法 2: Chocolatey**
```bash
choco install mongodb
```

**启动 MongoDB:**
```bash
# 如果安装为服务，会自动启动
# 手动启动：
mongod
```

#### macOS

```bash
# 使用 Homebrew
brew tap mongodb/brew
brew install mongodb-community

# 启动服务
brew services start mongodb-community

# 验证
brew services list
```

#### Linux (Ubuntu/Debian)

```bash
# 导入公钥
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# 添加源
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# 安装
sudo apt-get update
sudo apt-get install -y mongodb-org

# 启动
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 3. 验证 MongoDB

```bash
# 连接到 MongoDB
mongosh

# 应该看到 MongoDB shell
# 输入 exit 退出
```

### 4. 安装后端依赖

```bash
cd server
npm install
```

### 5. 配置环境变量

```bash
# 复制示例文件
cp .env.example .env

# 编辑 .env 文件（可选）
# 默认配置已经可以使用
```

### 6. 启动后端

```bash
# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

看到以下输出表示成功：

```
✅ MongoDB connected successfully
✅ WebSocket server started

╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎨 Whiteboard Collaboration Server                       ║
║                                                            ║
║   HTTP API:  http://localhost:3000                         ║
║   WebSocket: ws://localhost:3000                           ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

## 🧪 测试后端

### 1. 测试 HTTP API

```bash
# 健康检查
curl http://localhost:3000/health

# 应该返回：
# {"status":"ok","timestamp":"...","uptime":...}
```

### 2. 测试 WebSocket

打开浏览器控制台，运行：

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('✅ WebSocket 连接成功');
  
  // 发送加入房间消息
  ws.send(JSON.stringify({
    type: 'join',
    roomId: 'test-room',
    userId: 'test-user',
    data: {
      name: 'Test User',
      color: '#FF6B6B'
    }
  }));
};

ws.onmessage = (event) => {
  console.log('📨 收到消息:', JSON.parse(event.data));
};

ws.onerror = (error) => {
  console.error('❌ WebSocket 错误:', error);
};
```

## 🔧 常见问题

### MongoDB 连接失败

**错误**: `MongoServerError: connect ECONNREFUSED`

**解决方案**:
1. 确认 MongoDB 服务已启动
   ```bash
   # Windows
   tasklist | findstr mongod
   
   # macOS/Linux
   ps aux | grep mongod
   ```

2. 检查端口是否被占用
   ```bash
   # Windows
   netstat -ano | findstr :27017
   
   # macOS/Linux
   lsof -i :27017
   ```

3. 尝试重启 MongoDB
   ```bash
   # Windows
   net stop MongoDB
   net start MongoDB
   
   # macOS
   brew services restart mongodb-community
   
   # Linux
   sudo systemctl restart mongod
   ```

### 端口被占用

**错误**: `Error: listen EADDRINUSE: address already in use :::3000`

**解决方案**:
1. 查找占用端口的进程
   ```bash
   # Windows
   netstat -ano | findstr :3000
   
   # macOS/Linux
   lsof -i :3000
   ```

2. 终止进程或更改端口
   ```bash
   # 修改 .env 文件
   PORT=3001
   ```

### 依赖安装失败

**错误**: `npm ERR! code ENOENT`

**解决方案**:
1. 清除 npm 缓存
   ```bash
   npm cache clean --force
   ```

2. 删除 node_modules 重新安装
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. 使用国内镜像（中国用户）
   ```bash
   npm config set registry https://registry.npmmirror.com
   npm install
   ```

## 📊 数据库管理

### 使用 MongoDB Compass（GUI 工具）

1. 下载 https://www.mongodb.com/try/download/compass
2. 连接到 `mongodb://localhost:27017`
3. 查看 `whiteboard` 数据库

### 使用命令行

```bash
# 连接到数据库
mongosh

# 切换到 whiteboard 数据库
use whiteboard

# 查看所有集合
show collections

# 查看房间数据
db.rooms.find().pretty()

# 查看操作历史
db.operations.find().limit(10).sort({timestamp: -1})

# 清空数据（谨慎使用）
db.rooms.deleteMany({})
db.operations.deleteMany({})
```

## 🚀 下一步

1. 启动前端项目（回到根目录）
   ```bash
   cd ..
   npm run dev
   ```

2. 查看完整文档
   - [API 文档](../API.md)
   - [部署指南](../DEPLOYMENT.md)
   - [开发笔记](../开发笔记.md)

## 💡 提示

- 开发时使用 `npm run dev`，会自动重启
- 生产环境使用 `npm start` 或 PM2
- 定期备份 MongoDB 数据
- 使用 MongoDB Atlas 作为云数据库（推荐）

## 📞 需要帮助？

- 查看 [server/README.md](./README.md)
- 查看 [DEPLOYMENT.md](../DEPLOYMENT.md)
- 提交 Issue
