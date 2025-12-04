import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue';
import type { Editor } from '@/core';
import { AddShapeCommand } from '@/core/commands';
import { createShapeFromJSON } from '@/core/shapes';
import { getWebSocketUrl } from '@/config/websocket';

export function useCollaboration(editorRef: Ref<Editor | null>, roomId: string = 'default-room') {
  const isConnected = ref(false);
  const users = ref<any[]>([]);
  let ws: WebSocket | null = null;
  const userId = Math.random().toString(36).substr(2, 9);
  const userName = `User-${userId.substr(0, 4)}`;
  const userColor = `#${Math.floor(Math.random()*16777215).toString(16)}`;
  let isReceivingRemoteChange = false;

  const connect = () => {
    const editor = editorRef.value;
    if (!editor) return;

    const wsUrl = getWebSocketUrl();
    console.log('🔌 连接 WebSocket:', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket 连接成功');
      isConnected.value = true;

      // 发送加入房间消息
      ws?.send(JSON.stringify({
        type: 'join',
        roomId,
        userId,
        timestamp: Date.now(),
        data: {
          name: userName,
          color: userColor
        }
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('📨 收到消息:', message.type);

        switch (message.type) {
          case 'init_sync':
            // 初始化同步
            console.log('🔄 同步画布状态', message.data);
            if (message.data.canvas?.shapes && editor) {
              isReceivingRemoteChange = true;
              message.data.canvas.shapes.forEach((shapeData: any) => {
                try {
                  // 根据类型创建图形
                  const shape = createShapeFromData(shapeData.data);
                  if (shape) {
                    editor.scene.add(shape);
                  }
                } catch (err) {
                  console.error('加载图形失败:', err);
                }
              });
              editor.renderer.requestRender();
              isReceivingRemoteChange = false;
            }
            break;

          case 'join':
            console.log('👤 用户加入:', message.data.name);
            break;

          case 'leave':
            console.log('👋 用户离开:', message.userId);
            break;

          case 'command':
            console.log('🎨 收到远程操作:', message.data);
            handleRemoteCommand(message.data);
            break;
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
    };
  };

  // 创建图形从数据
  const createShapeFromData = (data: any) => {
    try {
      return createShapeFromJSON(data);
    } catch (error) {
      console.error('创建图形失败:', error, data);
      return null;
    }
  };

  // 处理远程命令
  const handleRemoteCommand = (data: any) => {
    const editor = editorRef.value;
    if (!editor || isReceivingRemoteChange) return;

    isReceivingRemoteChange = true;
    try {
      const operation = data.operation;
      if (operation?.command) {
        const cmd = operation.command;
        console.log('✅ 处理远程命令:', cmd.type, cmd);
        
        // 根据命令类型处理
        switch (cmd.type) {
          case 'add-shape':
            if (cmd.shape) {
              const shape = createShapeFromData(cmd.shape);
              if (shape) {
                console.log('✅ 添加远程图形:', (shape as any).type, shape.id);
                editor.scene.add(shape);
                editor.renderer.requestRender();
              }
            }
            break;
            
          case 'remove-shape':
          case 'delete-shape':
            if (cmd.shapeIds) {
              cmd.shapeIds.forEach((id: string) => {
                const shape = editor.scene.findById(id);
                if (shape) {
                  editor.scene.remove(shape);
                }
              });
              editor.renderer.requestRender();
            } else if (cmd.shapeId) {
              const shape = editor.scene.findById(cmd.shapeId);
              if (shape) {
                editor.scene.remove(shape);
                editor.renderer.requestRender();
              }
            }
            break;
            
          case 'move-shape':
            if (cmd.shapeId && cmd.delta) {
              const shape = editor.scene.findById(cmd.shapeId);
              if (shape) {
                (shape as any).x += cmd.delta.x;
                (shape as any).y += cmd.delta.y;
                editor.renderer.requestRender();
              }
            }
            break;
        }
      }
    } catch (error) {
      console.error('❌ 处理远程命令失败:', error);
    } finally {
      isReceivingRemoteChange = false;
    }
  };

  // 监听本地操作并发送
  const setupLocalChangeListener = () => {
    const editor = editorRef.value;
    if (!editor) return;

    // 监听命令执行
    const originalExecute = editor.commandManager.execute.bind(editor.commandManager);
    editor.commandManager.execute = async (command: any) => {
      // 先执行命令
      await originalExecute(command);
      
      // 如果不是远程变化，则广播
      if (!isReceivingRemoteChange && ws?.readyState === WebSocket.OPEN) {
        console.log('📤 发送本地操作:', command.constructor.name);
        
        // 提取命令数据
        let commandData: any = { type: command.constructor.name };
        
        if (command.constructor.name === 'AddShapeCommand' && command.shape) {
          commandData = {
            type: 'add-shape',
            shape: command.shape.toJSON()
          };
        } else if (command.constructor.name === 'RemoveShapeCommand' && command.shapes) {
          commandData = {
            type: 'remove-shape',
            shapeIds: command.shapes.map((s: any) => s.id)
          };
        } else if (command.constructor.name === 'MoveShapeCommand') {
          commandData = {
            type: 'move-shape',
            shapeId: command.shape?.id,
            delta: command.delta
          };
        }
        
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
    };
  };

  onMounted(() => {
    // 等待 editor 初始化完成
    watch(editorRef, (newEditor) => {
      if (newEditor && !ws) {
        connect();
        setupLocalChangeListener();
      }
    }, { immediate: true });
  });

  onUnmounted(() => {
    if (ws) {
      ws.close();
    }
  });

  return {
    isConnected,
    users,
    userId,
    userName
  };
}
