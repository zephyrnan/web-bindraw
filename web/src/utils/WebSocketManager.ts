import { WEBSOCKET_CONFIG } from '@/config/websocket';
import type { WebSocketMessage, MessageType } from '@/types/websocket';
import { createLogger } from './logger';

const logger = createLogger('WebSocket');

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer?: number;
  private messageHandlers = new Map<MessageType, (message: WebSocketMessage) => void>();

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(WEBSOCKET_CONFIG.url);
        
        this.ws.onopen = () => {
          logger.info('连接成功');
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (this.validateMessage(message)) {
              const handler = this.messageHandlers.get(message.type);
              if (handler) {
                handler(message);
              }
            }
          } catch (error) {
            logger.error('消息解析错误:', error);
          }
        };

        this.ws.onerror = (error) => {
          logger.error('WebSocket 错误:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          logger.warn('WebSocket 断开');
          this.handleConnectionError();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private validateMessage(message: unknown): message is WebSocketMessage {
    return (
      typeof message === 'object' &&
      message !== null &&
      'type' in message &&
      'userId' in message &&
      'timestamp' in message
    );
  }

  private handleConnectionError() {
    if (this.reconnectAttempts < WEBSOCKET_CONFIG.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.reconnectTimer = window.setTimeout(() => {
        logger.info(`重连尝试 ${this.reconnectAttempts}/${WEBSOCKET_CONFIG.maxReconnectAttempts}`);
        this.connect();
      }, WEBSOCKET_CONFIG.reconnectInterval);
    }
  }

  send(message: WebSocketMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  on(type: MessageType, handler: (message: WebSocketMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }

  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}