/**
 * AABB (轴对齐包围盒) 测试
 *
 * 测试要点：
 * 1. 包围盒创建和属性
 * 2. 点包含测试
 * 3. 包围盒相交测试
 * 4. 包围盒合并
 */

import { describe, it, expect } from 'vitest';
import { AABB, Vector } from '../index';

describe('AABB', () => {
  describe('构造和基本属性', () => {
    it('应该正确创建包围盒', () => {
      const aabb = new AABB(10, 20, 30, 40);

      expect(aabb.minX).toBe(10);
      expect(aabb.minY).toBe(20);
      expect(aabb.maxX).toBe(30);
      expect(aabb.maxY).toBe(40);
    });

    it('应该计算包围盒宽高', () => {
      const aabb = new AABB(10, 20, 30, 50);

      expect(aabb.width).toBe(20);
      expect(aabb.height).toBe(30);
    });

    it('应该计算包围盒中心点', () => {
      const aabb = new AABB(0, 0, 10, 20);

      expect(aabb.center.x).toBe(5);
      expect(aabb.center.y).toBe(10);
    });
  });

  describe('点包含测试', () => {
    it('包围盒内的点应该返回true', () => {
      const aabb = new AABB(0, 0, 10, 10);
      const point = new Vector(5, 5);

      expect(aabb.containsPoint(point)).toBe(true);
    });

    it('包围盒边界上的点应该返回true', () => {
      const aabb = new AABB(0, 0, 10, 10);

      expect(aabb.containsPoint(new Vector(0, 0))).toBe(true);
      expect(aabb.containsPoint(new Vector(10, 10))).toBe(true);
      expect(aabb.containsPoint(new Vector(0, 10))).toBe(true);
      expect(aabb.containsPoint(new Vector(10, 0))).toBe(true);
    });

    it('包围盒外的点应该返回false', () => {
      const aabb = new AABB(0, 0, 10, 10);

      expect(aabb.containsPoint(new Vector(-1, 5))).toBe(false);
      expect(aabb.containsPoint(new Vector(11, 5))).toBe(false);
      expect(aabb.containsPoint(new Vector(5, -1))).toBe(false);
      expect(aabb.containsPoint(new Vector(5, 11))).toBe(false);
    });
  });

  describe('包围盒相交测试', () => {
    it('完全重叠的包围盒应该相交', () => {
      const aabb1 = new AABB(0, 0, 10, 10);
      const aabb2 = new AABB(0, 0, 10, 10);

      expect(aabb1.intersects(aabb2)).toBe(true);
    });

    it('部分重叠的包围盒应该相交', () => {
      const aabb1 = new AABB(0, 0, 10, 10);
      const aabb2 = new AABB(5, 5, 15, 15);

      expect(aabb1.intersects(aabb2)).toBe(true);
      expect(aabb2.intersects(aabb1)).toBe(true);
    });

    it('边缘接触的包围盒应该相交', () => {
      const aabb1 = new AABB(0, 0, 10, 10);
      const aabb2 = new AABB(10, 0, 20, 10);

      expect(aabb1.intersects(aabb2)).toBe(true);
    });

    it('完全分离的包围盒不应该相交', () => {
      const aabb1 = new AABB(0, 0, 10, 10);
      const aabb2 = new AABB(20, 20, 30, 30);

      expect(aabb1.intersects(aabb2)).toBe(false);
      expect(aabb2.intersects(aabb1)).toBe(false);
    });

    it('一个包围盒完全包含另一个应该相交', () => {
      const aabb1 = new AABB(0, 0, 100, 100);
      const aabb2 = new AABB(10, 10, 20, 20);

      expect(aabb1.intersects(aabb2)).toBe(true);
      expect(aabb2.intersects(aabb1)).toBe(true);
    });
  });

  describe('包围盒包含测试', () => {
    it('应该正确判断包围盒包含关系', () => {
      const outer = new AABB(0, 0, 100, 100);
      const inner = new AABB(10, 10, 20, 20);

      expect(outer.contains(inner)).toBe(true);
      expect(inner.contains(outer)).toBe(false);
    });

    it('相同的包围盒应该互相包含', () => {
      const aabb1 = new AABB(0, 0, 10, 10);
      const aabb2 = new AABB(0, 0, 10, 10);

      expect(aabb1.contains(aabb2)).toBe(true);
      expect(aabb2.contains(aabb1)).toBe(true);
    });
  });

  describe('包围盒合并', () => {
    it('应该正确合并两个包围盒', () => {
      const aabb1 = new AABB(0, 0, 10, 10);
      const aabb2 = new AABB(5, 5, 15, 15);
      const merged = aabb1.merge(aabb2);

      expect(merged.minX).toBe(0);
      expect(merged.minY).toBe(0);
      expect(merged.maxX).toBe(15);
      expect(merged.maxY).toBe(15);
    });

    it('合并应该不修改原包围盒', () => {
      const aabb1 = new AABB(0, 0, 10, 10);
      const aabb2 = new AABB(5, 5, 15, 15);
      const merged = aabb1.merge(aabb2);

      expect(aabb1.maxX).toBe(10);
      expect(aabb2.minX).toBe(5);
    });
  });

  describe('包围盒扩展', () => {
    it('应该正确扩展包围盒', () => {
      const aabb = new AABB(10, 10, 20, 20);
      const expanded = aabb.expand(5);

      expect(expanded.minX).toBe(5);
      expect(expanded.minY).toBe(5);
      expect(expanded.maxX).toBe(25);
      expect(expanded.maxY).toBe(25);
    });

    it('负值扩展应该缩小包围盒', () => {
      const aabb = new AABB(0, 0, 10, 10);
      const shrunk = aabb.expand(-2);

      expect(shrunk.minX).toBe(2);
      expect(shrunk.minY).toBe(2);
      expect(shrunk.maxX).toBe(8);
      expect(shrunk.maxY).toBe(8);
    });
  });

  describe('边界情况', () => {
    it('零面积包围盒应该正确工作', () => {
      const aabb = new AABB(5, 5, 5, 5);

      expect(aabb.width).toBe(0);
      expect(aabb.height).toBe(0);
      expect(aabb.containsPoint(new Vector(5, 5))).toBe(true);
      expect(aabb.containsPoint(new Vector(6, 5))).toBe(false);
    });

    it('负面积包围盒应该正确处理', () => {
      // min > max 的情况
      const aabb = new AABB(10, 10, 0, 0);

      expect(aabb.width).toBe(-10);
      expect(aabb.height).toBe(-10);
    });
  });
});
