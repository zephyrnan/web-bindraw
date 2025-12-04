import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performanceMonitor, throttle, debounce } from '../performance';

describe('performance utils', () => {
  beforeEach(() => {
    performanceMonitor.clear();
  });

  describe('PerformanceMonitor', () => {
    it('should mark and measure performance', () => {
      performanceMonitor.mark('test');
      const duration = performanceMonitor.measure('test');

      expect(duration).toBeGreaterThanOrEqual(0);
    });

    it('should return null for non-existent mark', () => {
      const duration = performanceMonitor.measure('non-existent');
      expect(duration).toBeNull();
    });

    it('should store measures', () => {
      performanceMonitor.mark('test1');
      performanceMonitor.measure('test1');
      
      const measures = performanceMonitor.getMeasures();
      expect(measures.length).toBeGreaterThan(0);
    });

    it('should clear marks and measures', () => {
      performanceMonitor.mark('test');
      performanceMonitor.clear();
      
      const measures = performanceMonitor.getMeasures();
      expect(measures.length).toBe(0);
    });
  });

  describe('throttle', () => {
    it('should throttle function calls', async () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);

      throttled();
      throttled();
      throttled();

      expect(fn).toHaveBeenCalledTimes(1);

      await new Promise(resolve => setTimeout(resolve, 150));
      throttled();

      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('debounce', () => {
    it('should debounce function calls', async () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);

      debounced();
      debounced();
      debounced();

      expect(fn).not.toHaveBeenCalled();

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
