# API文档

> Vue3 Web协同画板 - 核心API参考

## 核心类

### Editor

主编辑器类，协调所有模块。

```typescript
import { Editor } from '@/core/Editor';

const editor = new Editor(canvas, {
  width: 800,
  height: 600,
  backgroundColor: '#ffffff'
});

// 基本操作
editor.setTool('select');  // 设置工具
editor.undo();             // 撤销
editor.redo();             // 重做
editor.setZoom(1.5);       // 设置缩放
editor.destroy();          // 销毁编辑器

// 导入导出
const data = editor.toJSON();
editor.fromJSON(data);
```

### Scene

场景管理，负责图形的增删查改。

```typescript
// 添加图形
scene.add(shape);

// 删除图形
scene.remove(shape);

// 查找图形
const shape = scene.findById('shape-id');
const shapes = scene.getShapes();

// 清空场景
scene.clear();
```

### Shape类

所有图形的基类。

```typescript
// 基本属性
shape.x = 100;
shape.y = 200;
shape.rotation = Math.PI / 4;
shape.scaleX = 1.5;
shape.scaleY = 1.5;
shape.visible = true;
shape.locked = false;
shape.zIndex = 10;

// 样式
shape.style = {
  fillStyle: '#3498db',
  strokeStyle: '#2980b9',
  lineWidth: 2,
  opacity: 0.8
};
```

#### Rect (矩形)

```typescript
import { Rect } from '@/core/shapes';

const rect = new Rect({
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  cornerRadius: 10
});
```

#### Circle (圆形)

```typescript
import { Circle } from '@/core/shapes';

const circle = new Circle({
  x: 100,
  y: 100,
  radius: 50
});
```

#### Line (线条)

```typescript
import { Line } from '@/core/shapes';

const line = new Line({
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 50 }
  ],
  smooth: true,
  smoothAlgorithm: 'catmullRom'
});
```

#### Text (文本)

```typescript
import { Text } from '@/core/shapes';

const text = new Text({
  x: 100,
  y: 100,
  content: 'Hello World',
  fontSize: 24,
  fontFamily: 'Arial'
});
```

## 工具 (Tools)

### SelectTool

选择和变换工具。

```typescript
editor.setTool('select');

// 支持的操作
// - 点击选择
// - 框选
// - 拖拽移动
// - 控制点缩放旋转
```

### RectTool

矩形绘制工具。

```typescript
editor.setTool('rect');

// 拖拽绘制矩形
```

### CircleTool

圆形绘制工具。

```typescript
editor.setTool('circle');

// 拖拽绘制圆形
```

### PenTool

钢笔工具（点击式绘制）。

```typescript
editor.setTool('pen');

// 点击添加点，双击完成
```

## 命令系统 (Commands)

命令模式实现撤销/重做。

```typescript
import { AddShapeCommand } from '@/core/commands';

const command = new AddShapeCommand(shape, scene);

// 执行命令
editor.commandManager.execute(command);

// 撤销
editor.commandManager.undo();

// 重做
editor.commandManager.redo();

// 清空历史
editor.commandManager.clear();
```

## 工具函数

### 文件导入导出

```typescript
import {
  exportToJSON,
  exportToPNG,
  exportToSVG,
  importFromJSON,
  selectFile
} from '@/utils/fileExport';

// 导出JSON
exportToJSON(editor, { filename: 'my-canvas' });

// 导出PNG
await exportToPNG(editor, {
  filename: 'my-canvas',
  quality: 0.92,
  backgroundColor: '#ffffff'
});

// 导出SVG
exportToSVG(editor.scene, { filename: 'my-canvas' });

// 导入JSON
const file = await selectFile('.json');
if (file) {
  await importFromJSON(editor, file);
}
```

### 数据验证

```typescript
import {
  validateShapeData,
  validateWebSocketMessage,
  safeJSONParse
} from '@/utils/validation';

// 验证图形数据
if (validateShapeData(data)) {
  // 数据有效
}

// 安全的JSON解析
const data = safeJSONParse(jsonString, {});
```

### 性能监控

```typescript
import {
  performanceMonitor,
  throttle,
  debounce
} from '@/utils/performance';

// 性能标记
performanceMonitor.mark('render-start');
// ... 执行操作
const duration = performanceMonitor.measure('render-start');

// 节流
const throttledFn = throttle(handleMouseMove, 16);

// 防抖
const debouncedFn = debounce(handleSearch, 300);
```

## Vue组件

### EditorExample

完整的编辑器示例组件。

```vue
<template>
  <EditorExample />
</template>

<script setup>
import EditorExample from '@/components/EditorExample.vue';
</script>
```

### PropertyPanel

属性面板组件。

```vue
<PropertyPanel
  :selected-shapes="selectedShapes"
  @update="handleUpdate"
/>
```

### LayerPanel

图层管理面板（新增）。

```vue
<LayerPanel
  :scene="editor.scene"
  @shape-selected="handleShapeSelected"
  @shape-updated="handleShapeUpdated"
/>
```

### RoomManager

房间管理组件（协同功能）。

```vue
<RoomManager
  @room-joined="handleRoomJoined"
  @room-left="handleRoomLeft"
/>
```

## Hooks

### useEditor

编辑器管理hook。

```typescript
import { useEditor } from '@/hooks/useEditor';

const {
  editor,
  canvas,
  selectedShapes,
  toolType,
  zoom,
  setTool,
  undo,
  redo,
  deleteSelected,
  exportJSON,
  importJSON
} = useEditor(canvasRef, { showStats: true });
```

### useCollaboration

协同功能hook。

```typescript
import { useCollaboration } from '@/hooks/useCollaboration';

const {
  connected,
  users,
  connect,
  disconnect
} = useCollaboration(editor, roomId);
```

## 事件

Editor支持的事件：

```typescript
editor.on('shapeAdded', (shape) => {
  console.log('图形已添加', shape);
});

editor.on('shapeRemoved', (shape) => {
  console.log('图形已删除', shape);
});

editor.on('selectionChanged', (shapes) => {
  console.log('选中的图形', shapes);
});

editor.on('zoomChanged', (zoom) => {
  console.log('缩放变化', zoom);
});
```

## WebSocket消息格式

### 加入房间

```typescript
{
  type: 'join',
  roomId: 'room-123',
  userId: 'user-456',
  timestamp: Date.now(),
  data: {
    user: {
      name: 'Username',
      color: '#3498db'
    }
  }
}
```

### 图形操作

```typescript
{
  type: 'command',
  roomId: 'room-123',
  userId: 'user-456',
  timestamp: Date.now(),
  data: {
    operation: {
      command: {
        type: 'add-shape',
        shape: { ... }
      }
    }
  }
}
```

## 类型定义

完整的类型定义请参考：
- [shared-types.ts](../../shared-types.ts) - 共享类型
- [src/core/shapes/Shape.ts](../core/shapes/Shape.ts) - 图形类型
- [src/types/websocket.ts](../types/websocket.ts) - WebSocket类型

## 示例

### 完整示例：创建并编辑图形

```typescript
import { Editor } from '@/core/Editor';
import { Rect, Circle } from '@/core/shapes';

// 1. 创建编辑器
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const editor = new Editor(canvas);

// 2. 创建图形
const rect = new Rect({
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  style: {
    fillStyle: '#3498db',
    strokeStyle: '#2980b9'
  }
});

const circle = new Circle({
  x: 400,
  y: 200,
  radius: 75,
  style: {
    fillStyle: '#e74c3c',
    strokeStyle: '#c0392b'
  }
});

// 3. 添加到场景
editor.scene.add(rect);
editor.scene.add(circle);

// 4. 启动渲染
editor.renderer.start();

// 5. 导出数据
const json = editor.toJSON();
console.log(json);
```

---

**文档版本**：v1.0.0
**更新时间**：2025-12-03
