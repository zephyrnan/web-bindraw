<template>
  <!-- 房间管理 -->
  <RoomManager
    @roomSelected="handleRoomSelected"
    @roomLeft="handleRoomLeft"
  />

  <div class="editor-container">
    <!-- 工具栏 -->
    <div class="toolbar">
      <button
        v-for="tool in tools"
        :key="tool.type"
        :class="['tool-btn', { active: currentTool === tool.type }]"
        @click="setTool(tool.type)"
        :title="`${tool.name} (${tool.shortcut})`"
      >
        {{ tool.icon }} {{ tool.name }}
      </button>

      <div class="toolbar-divider"></div>

      <button class="tool-btn" @click="undo" title="撤销 (Ctrl+Z)">
        ↶ 撤销
      </button>
      <button class="tool-btn" @click="redo" title="重做 (Ctrl+Y)">
        ↷ 重做
      </button>

      <div class="toolbar-divider"></div>

      <button class="tool-btn" @click="clear" title="清空画布">
        🗑️ 清空
      </button>

      <button class="tool-btn" @click="downloadScreenshot()" title="导出截图">
        📸 导出
      </button>

      <div class="toolbar-spacer"></div>

      <!-- 网格控制 -->
      <label class="grid-control">
        <input type="checkbox" v-model="showGrid" @change="toggleGrid" />
        <span>显示网格</span>
      </label>

      <div class="toolbar-divider"></div>

      <!-- 缩放控制 -->
      <div class="zoom-control">
        <button class="tool-btn" @click="setZoom(zoom - 0.1)">-</button>
        <span class="zoom-value">{{ (zoom * 100).toFixed(0) }}%</span>
        <button class="tool-btn" @click="setZoom(zoom + 0.1)">+</button>
        <button class="tool-btn" @click="setZoom(1)">重置</button>
      </div>

      <!-- 统计信息（已移除 FPS，使用 Stats.js 显示） -->
      <div class="stats">
        图形: {{ shapeCount }}
      </div>

      <!-- 协同状态 -->
      <div :class="['connection-status', { connected: isConnected, connecting: isConnecting }]">
        <template v-if="isConnecting">
          🔄 连接中...
        </template>
        <template v-else>
          {{ isConnected ? '🟢 已连接' : '🔴 未连接' }}
          <span v-if="isConnected" class="user-name">{{ userName }}</span>
        </template>
      </div>
    </div>

    <!-- 画布容器 -->
    <div class="canvas-wrapper">
      <canvas ref="canvasRef"></canvas>

      <!-- 属性面板 -->
      <PropertyPanel
        :selectedShapes="selectedShapes"
        :onStyleChange="updateSelectedStyle"
        :onDeleteSelected="deleteSelected"
        :onDuplicateSelected="duplicateSelected"
      />
    </div>

    <!-- 快捷键提示 -->
    <div class="shortcuts-hint">
      <div><kbd>V</kbd> 选择</div>
      <div><kbd>R</kbd> 矩形</div>
      <div><kbd>C</kbd> 圆形</div>
      <div><kbd>P</kbd> 钢笔（点击式）</div>
      <div><kbd>B</kbd> 画笔（拖拽式）</div>
      <div><kbd>Shift</kbd>+拖拽 = 正方形/圆形</div>
      <div><kbd>Shift</kbd>+点击 = 多选</div>
      <div><kbd>鼠标滚轮</kbd> = 缩放</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue';
import { useEditor } from '@/hooks/useEditor';
import PropertyPanel from './PropertyPanel.vue';
import RoomManager from './RoomManager.vue';
import type { ToolType, Editor } from '@/core';
import type { Command } from '@/core/commands';
import { getWebSocketUrl } from '@/config/websocket';
import type { WebSocketMessage, SerializedCommand, SerializedShape } from '@/types/websocket';
import type { ShapeData, CommandMessage } from '../../shared-types';

// Canvas ref
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 网格显示状态
const showGrid = ref(true);

// 使用编辑器
const {
  editor,
  currentTool,
  setTool,
  zoom,
  setZoom,
  fps,
  shapeCount,
  selectedShapes,
  updateSelectedStyle,
  deleteSelected,
  duplicateSelected,
  clear,
  undo,
  redo,
  downloadScreenshot,
} = useEditor({
  canvasRef,
  backgroundColor: '#ffffff',
  showGrid: true,
  gridSize: 20,
  initialTool: 'select',
});

// 房间管理
const currentRoomId = ref<string>('');
const isConnected = ref(false);
const isConnecting = ref(false);
const userName = ref('User-' + Math.random().toString(36).substr(2, 4));
let ws: WebSocket | null = null;

const handleRoomSelected = (roomId: string) => {
  currentRoomId.value = roomId;
  connectToRoom(roomId);
};

const handleRoomLeft = () => {
  if (ws) {
    ws.close();
    ws = null;
  }
  currentRoomId.value = '';
  isConnected.value = false;
  // 清空画布
  if (editor.value) {
    editor.value.scene.clear();
    editor.value.renderer.requestRender();
  }
};

const connectToRoom = (roomId: string) => {
  if (ws) ws.close();
  
  isConnecting.value = true;
  const userId = Math.random().toString(36).substr(2, 9);
  userName.value = `User-${userId.substr(0, 4)}`;
  
  ws = new WebSocket(getWebSocketUrl());
  let isReceivingRemote = false;

  ws.onopen = () => {
    console.log('✅ WebSocket 连接成功');
    isConnected.value = true;
    isConnecting.value = false;

    ws?.send(JSON.stringify({
      type: 'join',
      roomId,
      userId,
      timestamp: Date.now(),
      data: {
        name: userName.value,
        color: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }
    }));

    // 监听命令执行
    if (editor.value) {
      const commandManager = editor.value.commandManager;
      const originalExecute = commandManager.execute.bind(commandManager);
      
      commandManager.execute = async (command: Command): Promise<void> => {
        await originalExecute(command);
        
console.log('🔍 命令执行:', (command as any).constructor.name, 'isReceivingRemote:', isReceivingRemote,
  'wsState:', ws?.readyState);

        if (!isReceivingRemote && ws?.readyState === WebSocket.OPEN) {
          // 序列化命令数据
          const commandData = serializeCommand(command, editor.value!);
          console.log('🔍 序列化结果:', commandData);
          if (commandData) {
            console.log('📤 发送命令:', commandData.type);
            ws.send(JSON.stringify({
              type: 'command',
              roomId,
              userId,
              timestamp: Date.now(),
              data: {
                operation: {
                  command: commandData
                }
              }
            }));
          }
        }
      };
    }
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      console.log('📨 收到消息:', message.type);

      const messageData = message.data as any;
      if (message.type === 'init_sync' && messageData?.canvas?.shapes) {
        console.log('🔄 同步画布，图形数量:', messageData.canvas.shapes.length);
        // 加载已有图形
        if (editor.value && messageData.canvas.shapes.length > 0) {
          isReceivingRemote = true;
          
          import('@/core/shapes').then(({ createShapeFromJSON }) => {
            messageData.canvas.shapes.forEach((shapeWrapper: any) => {
              try {
                // 注意：shapeWrapper 结构是 { id, type, data }
                const wrapper = shapeWrapper as { data?: ShapeData; [key: string]: any };
                const shapeData = wrapper.data || shapeWrapper;
                console.log('加载图形:', shapeData);
                const shape = createShapeFromJSON(shapeData as ShapeData);
                if (shape && editor.value) {
                  editor.value.scene.add(shape);
                  console.log('✅ 图形加载成功:', shape.constructor.name, shape.id);
                }
              } catch (error) {
                console.error('❌ 图形加载失败:', error, shapeWrapper);
              }
            });
            
            if (editor.value) {
              editor.value.renderer.requestRender();
            }
            isReceivingRemote = false;
          });
        } else {
          isReceivingRemote = false;
        }
      } else if (message.type === 'command' && messageData) {
        // 过滤回声：不处理自己发出的消息
        if (message.userId === userId) {
          console.log('🚫 忽略自己的消息');
          return;
        }
        
        const cmd = messageData.operation?.command as SerializedCommand;
        if (!cmd) {
          console.warn('⚠️ 命令格式错误:', messageData);
          return;
        }
        console.log('🎨 收到操作:', cmd.type);
        
        if (!editor.value) return;
        
        isReceivingRemote = true;
        
        try {
          switch (cmd.type) {
            case 'add-shape':
              if (cmd.shape) handleAddShape(cmd.shape, editor.value);
              break;
            case 'remove-shape':
              if (cmd.shapeId) handleRemoveShape(cmd.shapeId, editor.value);
              break;
            case 'move-shape':
              if (cmd.shapeId && cmd.x !== undefined && cmd.y !== undefined) {
                handleMoveShape(cmd.shapeId, cmd.x, cmd.y, editor.value);
              }
              break;
            case 'modify-shape':
              if (cmd.shapeId && cmd.changes) handleModifyShape(cmd.shapeId, cmd.changes, editor.value);
              break;
            default:
              console.warn('⚠️ 未知命令类型:', cmd.type);
          }
        } catch (error) {
          console.error('处理远程命令失败:', error);
        } finally {
          isReceivingRemote = false;
        }
      }
    } catch (error) {
      console.error('消息解析错误:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket 错误:', error);
  };

  ws.onclose = () => {
    console.log('🔌 WebSocket 断开');
    isConnected.value = false;
    isConnecting.value = false;
  };
};

// 序列化命令
const serializeCommand = (command: Command, editorInstance: any): SerializedCommand | null => {
  const commandName = (command as any).name || (command as any).constructor.name;
  console.log('🔍 命令名称:', commandName);
  
  switch (commandName) {
     case 'AddShape':        // 使用 command.name
  case 'AddShapeCommand': // 使用 constructor.name (开发环境)
  {
    // 直接从命令对象获取 shape
    const shape = (command as any).shape;
    if (!shape) {
      console.warn('⚠️ AddShapeCommand 没有 shape');
      return null;
    }
    const serializedShape = serializeShape(shape);
    if (!serializedShape) return null;
    return {
      type: 'add-shape',
      shape: serializedShape
    };
  }
    case 'RemoveShape':
    case 'RemoveShapeCommand': {
      const shapeId = (command as any).shape?.id;
      if (!shapeId) return null;
      return {
        type: 'remove-shape',
        shapeId
      };
    }
    case 'MoveShapeCommand': {
      // MoveShapeCommand 使用 dx/dy 增量，但我们需要发送绝对位置
      const shape = (command as any).shapes?.[0];
      if (shape && shape.id && typeof shape.x === 'number' && typeof shape.y === 'number') {
        return {
          type: 'move-shape',
          shapeId: shape.id,
          x: shape.x,
          y: shape.y
        };
      }
      return null;
    }
    case 'ModifyShapeCommand': {
      const shapeId = (command as any).shape?.id;
      const changes = (command as any).newProps;
      if (!shapeId || !changes) return null;
      return {
        type: 'modify-shape',
        shapeId,
        changes
      };
    }
    default:
      return null;
  }
};

// 序列化图形
const serializeShape = (shape: any): SerializedShape | undefined => {
  try {
    if (!shape || typeof shape !== 'object' || typeof shape.toJSON !== 'function') {
      throw new Error('Invalid shape object');
    }
    const serialized = shape.toJSON() as SerializedShape;
    if (!serialized.id || !serialized.type) {
      throw new Error('Invalid serialized shape');
    }
    return serialized;
  } catch (error) {
    console.error('Shape serialization failed:', error);
    return undefined;
  }
};

// 处理远程命令
const handleAddShape = (shapeData: SerializedShape, editorInstance: any) => {
  import('@/core/shapes').then(({ createShapeFromJSON }) => {
    try {
      const shape = createShapeFromJSON(shapeData);
      if (shape) {
        editorInstance.scene.add(shape);
        editorInstance.renderer.requestRender();
        console.log('✅ 远程图形添加成功:', (shape as any).type, shape.id);
      }
    } catch (error) {
      console.error('❌ 创建远程图形失败:', error, shapeData);
    }
  });
};

const handleRemoveShape = (shapeId: string, editorInstance: any) => {
  const shape = editorInstance.scene.findById(shapeId);
  if (shape) {
    editorInstance.scene.remove(shape);
    console.log('✅ 远程图形删除成功');
  }
};

const handleMoveShape = (shapeId: string, x: number, y: number, editorInstance: any) => {
  const shape = editorInstance.scene.findById(shapeId);
  if (shape) {
    (shape as any).x = x;
    (shape as any).y = y;
    editorInstance.renderer.requestRender();
    console.log('✅ 远程图形移动成功:', shapeId, `(${x}, ${y})`);
  } else {
    console.warn('⚠️ 找不到图形:', shapeId);
  }
};

const handleModifyShape = (shapeId: string, changes: Record<string, any>, editorInstance: any) => {
  const shape = editorInstance.scene.findById(shapeId);
  if (shape) {
    Object.assign(shape as any, changes);
    editorInstance.renderer.requestRender();
    console.log('✅ 远程图形修改成功');
  }
};

onUnmounted(() => {
  if (ws) {
    ws.close();
  }
});

// 工具列表
const tools: Array<{ type: ToolType; name: string; icon: string; shortcut: string }> = [
  { type: 'select', name: '选择', icon: '→', shortcut: 'V' },
  { type: 'rect', name: '矩形', icon: '▭', shortcut: 'R' },
  { type: 'circle', name: '圆形', icon: '○', shortcut: 'C' },
  { type: 'pen', name: '钢笔', icon: '✎', shortcut: 'P' },
  { type: 'brush', name: '画笔', icon: '🖌', shortcut: 'B' },
];

// 切换网格显示
const toggleGrid = () => {
  if (editor.value) {
    (editor.value as any).showGrid = showGrid.value;
    editor.value.renderer.requestRender();
  }
};
</script>

<style scoped>
.editor-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: calc(100vh - 48px - 3rem); /* 减去主内容区的 padding */
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.tool-btn {
  padding: 8px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.tool-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.toolbar-divider {
  width: 1px;
  height: 24px;
  background: #e0e0e0;
}

.toolbar-spacer {
  flex: 1;
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.zoom-value {
  min-width: 50px;
  text-align: center;
  font-size: 14px;
  font-weight: 500;
}

.stats {
  padding: 8px 12px;
  background: #f3f4f6;
  border-radius: 4px;
  font-size: 12px;
  font-family: monospace;
  color: #6b7280;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: white;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
  cursor: default;
}

.grid-control {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  cursor: pointer;
  user-select: none;
}

.grid-control input[type="checkbox"] {
  cursor: pointer;
}

.grid-control span {
  font-size: 14px;
  color: #374151;
}

.shortcuts-hint {
  position: absolute;
  bottom: 16px;
  right: 16px;
  top: auto;
  margin-top: 100px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  pointer-events: none;
  font-family: monospace;
}

kbd {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: monospace;
  font-size: 11px;
}

.connection-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #fee;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  color: #c00;
}

.connection-status.connected {
  background: #efe;
  color: #060;
}

.connection-status.connecting {
  background: #fef3cd;
  color: #856404;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.user-name {
  font-size: 11px;
  opacity: 0.8;
}
</style>
