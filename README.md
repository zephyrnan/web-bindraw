# 🎨 web协绘坊

> 专业级图形编辑器 + 实时多人协同 | Vue 3 + TypeScript + Canvas + WebSocket

<p align="center">
  <a href="https://web-bindraw.vercel.app" target="_blank">🔗 在线演示</a> •
  <a href="https://github.com/zephyrnan/web-bindraw" target="_blank">📦 GitHub</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Vue-3.5.17-brightgreen" alt="Vue">
  <img src="https://img.shields.io/badge/TypeScript-5.8-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-20_LTS-green" alt="Node.js">
  <img src="https://img.shields.io/badge/MongoDB-8.0-green" alt="MongoDB">
  <img src="https://img.shields.io/badge/License-MIT-yellow" alt="License">
</p>

## ✨ 项目特点

- 🎯 **框架无关的核心引擎** - 纯 TypeScript 实现，可移植到任何前端框架
- ⚡ **60 FPS 流畅渲染** - 四叉树空间分区 + 智能脏标记优化
- 🎨 **5种专业绘图工具** - 选择、矩形、圆形、钢笔、画笔
- 🔄 **完整撤销/重做** - 命令模式实现，支持100步历史记录
- 👥 **实时多人协同** - WebSocket 实时同步 + MongoDB 持久化
- 🧪 **高测试覆盖** - 76个单元测试，TypeScript 严格模式
- 📐 **5种路径平滑算法** - RDP、Catmull-Rom、贝塞尔等专业算法

## 🚀 快速开始

### 前端启动

```bash
cd web
npm install
npm run dev
# 访问 http://localhost:5173
```

### 后端启动

```bash
cd server
npm install
npm run dev
# WebSocket 服务器: ws://localhost:3000
```

### 完整环境

```bash
# 前端 + 后端同时启动
cd web
npm run start:dev
```

## 📸 功能展示

### 核心功能

- ✅ **图形绘制** - 矩形、圆形、线条、自由笔刷
- ✅ **图形变换** - 拖拽、缩放、旋转（8个控制点 + 旋转控制点）
- ✅ **多选操作** - 框选、批量操作、属性编辑
- ✅ **撤销/重做** - Ctrl+Z / Ctrl+Y，100步历史
- ✅ **协同编辑** - 实时同步、用户状态、在线用户列表
- ✅ **性能监控** - Stats.js 实时 FPS 监控

### 绘图工具

| 工具 | 快捷键 | 功能 |
|------|-------|------|
| 选择工具 | V | 拖拽、框选、多选、变换 |
| 矩形工具 | R | 绘制矩形（Shift 约束正方形） |
| 圆形工具 | C | 绘制圆形（Shift 约束正圆） |
| 钢笔工具 | P | 点击式绘制折线（Enter 完成） |
| 画笔工具 | B | 拖拽式自由绘制 + 路径平滑 |

## 🛠️ 技术栈

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5.17 | UI 框架 |
| TypeScript | 5.8 | 类型安全 |
| Vite | 6.3.5 | 构建工具 |
| Canvas API | 原生 | 图形渲染 |
| Vitest | 4.0.14 | 单元测试 |
| ESLint + Prettier | 9.x + 3.x | 代码规范 |

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 20 LTS | 运行时 |
| Koa | 3.0 | HTTP 服务器 |
| MongoDB | 8.0 | 数据库 |
| Mongoose | latest | ORM |
| WebSocket | ws 8.18 | 实时通信 |

### 核心引擎

- **纯 TypeScript** - 与框架解耦
- **矩阵变换系统** - 坐标转换、视图变换
- **向量数学库** - 完整的向量运算
- **命令模式** - 撤销/重做系统
- **策略模式** - 工具管理器
- **发布-订阅** - 事件系统

## 📂 项目结构

```
web协同画板/
├── web/                    # 前端项目
│   ├── src/
│   │   ├── core/          # 核心引擎（框架无关）
│   │   ├── tools/         # 绘图工具
│   │   ├── shapes/        # 图形类
│   │   ├── math/          # 数学库
│   │   ├── algorithms/    # 算法库
│   │   └── components/    # Vue 组件
│   └── tests/             # 单元测试
│
├── server/                 # 后端项目
│   └── src/
│       ├── models/        # 数据模型
│       ├── services/      # 业务逻辑
│       └── routes/        # API 路由
│
├── docs/                   # 详细文档
└── 面试指南.md             # 面试技巧
```

## 📖 文档导航

### 核心文档
- **[面试指南](面试指南.md)** - 项目亮点、面试话术、技术问答
- **[AI 开发规范](CLAUDE.md)** - 项目开发规范

### 详细文档
- **[开发历程](docs/开发历程.md)** - 完整的开发过程和问题修复
- **[架构设计](docs/架构设计.md)** - 前后端架构、数据流设计
- **[设计模式](docs/设计模式.md)** - 策略、命令、发布-订阅、工厂模式

### 前后端文档
- **[前端文档](web/README.md)** - 前端完整开发文档
- **[后端文档](server/README.md)** - 后端服务器文档
- **[API 文档](server/API.md)** - WebSocket 和 REST API

## 🎯 核心特性详解

### 1. 框架无关的核心引擎

核心引擎采用纯 TypeScript 实现，与 Vue 完全解耦：

```typescript
// 核心引擎 - 纯 TypeScript
export class Editor {
  private canvas: Canvas;
  private scene: Scene;
  private toolManager: ToolManager;

  constructor(options: EditorOptions) {
    this.canvas = new Canvas(options.canvas);
    this.scene = new Scene();
    this.toolManager = new ToolManager(this);
  }
}

// Vue 层 - 仅负责 UI
export function useEditor(options: UseEditorOptions) {
  const editor = ref<Editor | null>(null);
  onMounted(() => {
    editor.value = new Editor({ canvas: canvasRef.value });
  });
  return { editor };
}
```

### 2. 性能优化

- **60 FPS 流畅渲染** - requestAnimationFrame 渲染循环
- **四叉树空间分区** - 大量图形时的快速查询
- **AABB 快速碰撞检测** - 两阶段检测算法
- **路径简化** - RDP 算法减少绘制点数

### 3. 设计模式实践

- **策略模式** - 工具切换系统（5种工具）
- **命令模式** - 撤销/重做机制（100步历史）
- **发布-订阅** - 事件系统解耦
- **工厂模式** - 图形创建

### 4. 实时协同

- **WebSocket 实时通信** - 低延迟操作同步
- **MongoDB 持久化** - 房间状态和历史记录
- **用户状态管理** - 在线用户列表、光标位置
- **操作广播** - 图形操作实时同步

## 📊 性能指标

| 指标 | 数值 | 说明 |
|------|------|------|
| FPS | 60 | 稳定在浏览器刷新率上限 |
| 单元测试 | 76 个 | 全部通过 |
| 构建大小 | 153 KB | gzip 后 53 KB |
| 代码质量 | 9.8/10 | TypeScript 严格模式 |
| 测试覆盖 | 高 | 核心模块全覆盖 |

## 🧪 开发命令

### 前端命令

```bash
npm run dev              # 启动开发服务器
npm run build            # 生产构建
npm run preview          # 预览构建产物
npm run type-check       # TypeScript 类型检查
npm run lint             # ESLint 检查并修复
npm run format           # Prettier 格式化
npm run test             # 运行单元测试
npm run test:ui          # 测试 UI 界面
npm run test:coverage    # 测试覆盖率报告
```

### 后端命令

```bash
npm start               # 生产模式启动
npm run dev             # 开发模式（自动重启）
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request


## 🙏 致谢

- [Vue.js](https://vuejs.org/) - 渐进式 JavaScript 框架
- [Vite](https://vitejs.dev/) - 下一代前端构建工具
- [Fabric.js](https://github.com/fabricjs/fabric.js) - Canvas 图形库参考
- [Excalidraw](https://github.com/excalidraw/excalidraw) - 手绘风格白板参考

---

**最后更新**: 2025-12-04
**项目状态**: 生产就绪 ✅
**代码质量**: 9.8/10 ⭐⭐⭐⭐⭐
