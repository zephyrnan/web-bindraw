







 🚀 部署指南

## 📋 部署前准备

### 环境要求
- **Node.js**: >= 20.0.0
- **MongoDB Atlas**: 云数据库账号
- **域名**: 生产环境域名（可选）

### 配置文件
1. **服务器配置** (`server/.env`)
```bash
PORT=3000
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/whiteboard
CORS_ORIGIN=https://your-domain.com
```

2. **前端配置** (`.env.local`)
```bash
VITE_WS_URL=wss://your-domain.com
NODE_ENV=production
```

## 🌐 部署方案

### 方案1: Vercel + Railway (推荐)

#### 前端部署 (Vercel)
```bash
# 1. 构建项目
npm run build

# 2. 部署到 Vercel
npx vercel --prod
```

#### 后端部署 (Railway)
```bash
# 1. 安装 Railway CLI
npm install -g @railway/cli

# 2. 登录并部署
railway login
railway init
railway up
```

### 方案2: Docker 部署

#### Dockerfile (后端)
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --only=production
COPY server/ .
EXPOSE 3000
CMD ["npm", "start"]
```

#### docker-compose.yml
```yaml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "5173:5173"
  backend:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - MONGODB_URI=${MONGODB_URI}
```

### 方案3: 传统服务器部署

#### 使用 PM2
```bash
# 1. 安装 PM2
npm install -g pm2

# 2. 启动后端
cd server
pm2 start src/index.js --name whiteboard-server

# 3. 构建前端
cd ..
npm run build

# 4. 使用 Nginx 服务前端
```

#### Nginx 配置
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 环境变量配置

### MongoDB Atlas 设置
1. 创建 MongoDB Atlas 账号
2. 创建集群和数据库
3. 获取连接字符串
4. 配置网络访问权限

### WebSocket 配置
- **开发环境**: `ws://localhost:3000`
- **生产环境**: `wss://your-domain.com`

## 📊 性能优化

### 前端优化
```bash
# 1. 分析包大小
npm run build -- --analyze

# 2. 启用 gzip 压缩
# 在服务器配置中启用

# 3. CDN 加速
# 将静态资源部署到 CDN
```

### 后端优化
```javascript
// 启用压缩中间件
import compression from 'compression';
app.use(compression());

// 设置缓存头
app.use(express.static('public', {
  maxAge: '1d'
}));
```

## 🔒 安全配置

### HTTPS 配置
```bash
# 使用 Let's Encrypt
certbot --nginx -d your-domain.com
```

### 安全头设置
```javascript
import helmet from 'helmet';
app.use(helmet());
```

## 📈 监控和日志

### 日志配置
```javascript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

### 健康检查
```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

## 🚨 故障排除

### 常见问题
1. **WebSocket 连接失败**
   - 检查防火墙设置
   - 确认 WSS 证书配置

2. **MongoDB 连接超时**
   - 检查网络访问权限
   - 验证连接字符串

3. **CORS 错误**
   - 更新 CORS_ORIGIN 配置
   - 检查域名配置

### 日志查看
```bash
# PM2 日志
pm2 logs whiteboard-server

# Docker 日志
docker logs container-name

# 系统日志
tail -f /var/log/nginx/error.log
```