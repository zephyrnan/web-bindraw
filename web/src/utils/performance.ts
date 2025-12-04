/**
 * 性能监控工具
 * 用于追踪和优化应用性能
 */

interface PerformanceMark {
  name: string;
  startTime: number;
  duration?: number;
}

class PerformanceMonitor {
  private marks = new Map<string, number>();
  private measures: PerformanceMark[] = [];
  private enabled = import.meta.env.NODE_ENV === 'development';

  /**
   * 开始性能标记
   */
  mark(name: string): void {
    if (!this.enabled) return;
    this.marks.set(name, performance.now());
  }

  /**
   * 结束性能标记并计算耗时
   */
  measure(name: string): number | null {
    if (!this.enabled) return null;

    const startTime = this.marks.get(name);
    if (startTime === undefined) {
      console.warn(`Performance mark "${name}" not found`);
      return null;
    }

    const duration = performance.now() - startTime;
    this.measures.push({ name, startTime, duration });
    this.marks.delete(name);

    return duration;
  }

  /**
   * 获取所有测量结果
   */
  getMeasures(): PerformanceMark[] {
    return [...this.measures];
  }

  /**
   * 清除所有标记和测量
   */
  clear(): void {
    this.marks.clear();
    this.measures = [];
  }

  /**
   * 打印性能报告
   */
  report(): void {
    if (!this.enabled || this.measures.length === 0) return;

    console.group('📊 Performance Report');
    this.measures.forEach(({ name, duration }) => {
      console.log(`${name}: ${duration?.toFixed(2)}ms`);
    });
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * 性能装饰器（用于类方法）
 */
export function measurePerformance(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: unknown[]) {
    const markName = `${(target as any).constructor.name}.${propertyKey}`;
    performanceMonitor.mark(markName);
    
    const result = originalMethod.apply(this, args);
    
    const duration = performanceMonitor.measure(markName);
    if (duration && duration > 16) { // 超过一帧时间（16ms）
      console.warn(`⚠️ Slow operation: ${markName} took ${duration.toFixed(2)}ms`);
    }
    
    return result;
  };

  return descriptor;
}

/**
 * 节流函数
 */
export function throttle<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  
  return function (...args: Parameters<T>) {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * 防抖函数
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}
