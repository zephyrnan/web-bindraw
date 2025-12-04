/**
 * 事件发射器
 * 实现发布-订阅模式
 *
 * 面试考点：
 * 1. 什么是发布-订阅模式？—— 对象间一对多依赖关系，当状态改变时通知所有订阅者
 * 2. 与观察者模式的区别？—— 发布-订阅有事件中心解耦，观察者直接依赖
 * 3. 如何避免内存泄漏？—— 及时 off，使用 once，WeakMap 存储
 */

type EventHandler<T extends any[]> = (...args: T) => void;

type EventMap = Record<string, any[]>;

/**
 * 类型安全的事件发射器
 */
export class EventEmitter<TEvents extends EventMap = EventMap> {
  /** 事件监听器映射 */
  private listeners = new Map<
    keyof TEvents,
    Set<EventHandler<any>>
  >();

  /** 一次性监听器映射 */
  private onceListeners = new Map<
    keyof TEvents,
    Set<EventHandler<any>>
  >();

  /**
   * 监听事件
   */
  on<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * 监听事件（一次性）
   */
  once<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void {
    if (!this.onceListeners.has(event)) {
      this.onceListeners.set(event, new Set());
    }
    this.onceListeners.get(event)!.add(handler);
  }

  /**
   * 取消监听
   */
  off<K extends keyof TEvents>(
    event: K,
    handler: EventHandler<TEvents[K]>
  ): void {
    this.listeners.get(event)?.delete(handler);
    this.onceListeners.get(event)?.delete(handler);
  }

  /**
   * 触发事件
   */
  emit<K extends keyof TEvents>(event: K, ...args: TEvents[K]): void {
    // 调用普通监听器
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[EventEmitter] Error in ${String(event)} handler:`, error);
        }
      });
    }

    // 调用一次性监听器
    const onceHandlers = this.onceListeners.get(event);
    if (onceHandlers) {
      onceHandlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`[EventEmitter] Error in ${String(event)} once handler:`, error);
        }
      });
      // 清除一次性监听器
      this.onceListeners.delete(event);
    }
  }

  /**
   * 移除指定事件的所有监听器
   */
  removeAllListeners<K extends keyof TEvents>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
      this.onceListeners.delete(event);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  /**
   * 获取指定事件的监听器数量
   */
  listenerCount<K extends keyof TEvents>(event: K): number {
    const count = (this.listeners.get(event)?.size ?? 0) +
                  (this.onceListeners.get(event)?.size ?? 0);
    return count;
  }

  /**
   * 获取所有事件名
   */
  eventNames(): Array<keyof TEvents> {
    const events = new Set<keyof TEvents>();
    this.listeners.forEach((_, key) => events.add(key));
    this.onceListeners.forEach((_, key) => events.add(key));
    return Array.from(events);
  }
}
