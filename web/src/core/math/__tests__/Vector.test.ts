/**
 * Vector 测试
 *
 * 测试要点：
 * 1. 基本运算（加减乘除）
 * 2. 向量长度和归一化
 * 3. 点积和叉积
 * 4. 边界情况处理
 */

import { describe, it, expect } from 'vitest';
import { Vector } from '../Vector';

describe('Vector', () => {
  describe('构造和基本属性', () => {
    it('应该正确创建向量', () => {
      const v = new Vector(3, 4);
      expect(v.x).toBe(3);
      expect(v.y).toBe(4);
    });

    it('应该计算向量长度', () => {
      const v = new Vector(3, 4);
      expect(v.length()).toBe(5);
    });

    it('应该计算零向量长度', () => {
      const v = new Vector(0, 0);
      expect(v.length()).toBe(0);
    });
  });

  describe('向量运算', () => {
    it('应该正确相加向量', () => {
      const v1 = new Vector(1, 2);
      const v2 = new Vector(3, 4);
      const result = v1.add(v2);

      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
      // 检查不可变性
      expect(v1.x).toBe(1);
      expect(v1.y).toBe(2);
    });

    it('应该正确相减向量', () => {
      const v1 = new Vector(5, 7);
      const v2 = new Vector(2, 3);
      const result = v1.subtract(v2);

      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('应该正确标量乘法', () => {
      const v = new Vector(2, 3);
      const result = v.multiply(2);

      expect(result.x).toBe(4);
      expect(result.y).toBe(6);
    });

    it('应该正确标量除法', () => {
      const v = new Vector(6, 8);
      const result = v.divide(2);

      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('除以零应该抛出错误', () => {
      const v = new Vector(1, 1);
      expect(() => v.divide(0)).toThrow();
    });
  });

  describe('向量归一化', () => {
    it('应该正确归一化向量', () => {
      const v = new Vector(3, 4);
      const normalized = v.normalize();

      expect(normalized.length()).toBeCloseTo(1, 5);
      expect(normalized.x).toBeCloseTo(0.6, 5);
      expect(normalized.y).toBeCloseTo(0.8, 5);
    });

    it('零向量归一化应该返回零向量', () => {
      const v = new Vector(0, 0);
      const normalized = v.normalize();

      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });
  });

  describe('点积', () => {
    it('应该正确计算点积', () => {
      const v1 = new Vector(2, 3);
      const v2 = new Vector(4, 5);
      const result = v1.dot(v2);

      expect(result).toBe(23); // 2*4 + 3*5
    });

    it('垂直向量点积应该为0', () => {
      const v1 = new Vector(1, 0);
      const v2 = new Vector(0, 1);
      const result = v1.dot(v2);

      expect(result).toBe(0);
    });
  });

  describe('距离计算', () => {
    it('应该正确计算两点距离', () => {
      const v1 = new Vector(0, 0);
      const v2 = new Vector(3, 4);
      const distance = v1.distanceTo(v2);

      expect(distance).toBe(5);
    });

    it('相同点距离应该为0', () => {
      const v1 = new Vector(5, 5);
      const v2 = new Vector(5, 5);
      const distance = v1.distanceTo(v2);

      expect(distance).toBe(0);
    });
  });

  describe('向量克隆和相等性', () => {
    it('应该正确克隆向量', () => {
      const v1 = new Vector(1, 2);
      const v2 = v1.clone();

      expect(v2.x).toBe(v1.x);
      expect(v2.y).toBe(v1.y);
      expect(v2).not.toBe(v1); // 确保是新对象
    });

    it('应该正确判断向量相等', () => {
      const v1 = new Vector(1, 2);
      const v2 = new Vector(1, 2);
      const v3 = new Vector(2, 3);

      expect(v1.equals(v2)).toBe(true);
      expect(v1.equals(v3)).toBe(false);
    });
  });

  describe('静态方法', () => {
    it('应该创建零向量', () => {
      const zero = Vector.zero();

      expect(zero.x).toBe(0);
      expect(zero.y).toBe(0);
    });

    it('应该创建单位向量', () => {
      const one = Vector.one();

      expect(one.x).toBe(1);
      expect(one.y).toBe(1);
    });
  });
});
