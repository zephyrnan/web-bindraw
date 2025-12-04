import { ref, onUnmounted } from 'vue';
import { WEBSOCKET_CONFIG } from '@/config/websocket';
import type { WebSocketMessage, MessageType } from '@/types/websocket';

export function useWebSocket() {
  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const isConnecting = ref(false);
  const reconnectAttempts = ref(0);
  
  let reconnectTimer: number | null = null;
  const messageHandlers = new Map<MessageType, (message: WebSocketMessage) => void>();

  const connect = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (ws.value?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      isConnecting.value = true;
      
      try {
        ws.value = new WebSocket(WEBSOCKET_CONFIG.url);
        
        ws.value.onopen = () => {
          console.log('✅ WebSocket 连接成功');
          isConnected.value = true;
          isConnecting.value = false;
          reconnectAttempts.value = 0;
          resolve();
        };

        ws.value.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (validateMessage(message)) {
              const handler = messageHandlers.get(message.type);
              if (handler) {
                handler(message);
              }
            }
          } catch (error) {
            console.error('消息解析错误:', error);
          }
        };

        ws.value.onerror = (error) => {
          console.error('❌ WebSocket 错误:', error);
          isConnecting.value = false;
          reject(error);
        };

        ws.value.onclose = () => {
          console.log('🔌 WebSocket 断开');
          isConnected.value = false;
          isConnecting.value = false;
          handleReconnect();
        };
      } catch (error) {
        isConnecting.value = false;
        reject(error);
      }
    });
  };

  const validateMessage = (message: unknown): message is WebSocketMessage => {
    return (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      'userId' in message &&
      'timestamp' in message
    );
  };

  const handleReconnect = () => {
    if (reconnectAttempts.value < WEBSOCKET_CONFIG.maxReconnectAttempts) {
      reconnectAttempts.value++;
      reconnectTimer = window.setTimeout(() => {
        console.log(`重连尝试 ${reconnectAttempts.value}/${WEBSOCKET_CONFIG.maxReconnectAttempts}`);
        connect().catch(console.error);
      }, WEBSOCKET_CONFIG.reconnectInterval);
    }
  };

  const send = (message: WebSocketMessage): void => {
    if (ws.value?.readyState === WebSocket.OPEN) {
      ws.value.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket 未连接，消息发送失败');
    }
  };

  const on = (type: MessageType, handler: (message: WebSocketMessage) => void): void => {
    messageHandlers.set(type, handler);
  };

  const off = (type: MessageType): void => {
    messageHandlers.delete(type);
  };

  const close = (): void => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws.value) {
      ws.value.close();
      ws.value = null;
    }
    isConnected.value = false;
    isConnecting.value = false;
  };

  onUnmounted(() => {
    close();
  });

  return {
    ws,
    isConnected,
    isConnecting,
    reconnectAttempts,
    connect,
    send,
    on,
    off,
    close
  };
}