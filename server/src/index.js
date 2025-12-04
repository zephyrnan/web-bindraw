import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { connectDatabase } from './config/database.js';
import { WebSocketService } from './services/WebSocketService.js';
import { errorHandler } from './middleware/errorHandler.js';
import roomRoutes from './routes/rooms.js';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/rooms', roomRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// 404 处理
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not Found' });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
async function start() {
  try {
    // 连接数据库
    await connectDatabase();

    // 创建 HTTP 服务器
    const server = createServer(app);

    // 启动 WebSocket 服务
    new WebSocketService(server);

    // 启动服务器
    server.listen(PORT, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🎨 Whiteboard Collaboration Server                       ║
║                                                            ║
║   HTTP API:  http://localhost:${PORT}                         ║
║   WebSocket: ws://localhost:${PORT}                           ║
║                                                            ║
║   Environment: ${process.env.NODE_ENV || 'development'}                                  ║
║   MongoDB:     ${process.env.MONGODB_URI ? '✅ Connected' : '❌ Not configured'}                            ║
║                                                            ║
║   API Endpoints:                                           ║
║   - GET  /health                                           ║
║   - GET  /api/rooms/:roomId                                ║
║   - POST /api/rooms                                        ║
║   - GET  /api/rooms/:roomId/operations                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
