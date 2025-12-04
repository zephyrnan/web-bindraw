/**
 * Matrix 测试
 *
 * 测试要点：
 * 1. 矩阵基本操作（平移、缩放、旋转）
 * 2. 矩阵乘法
 * 3. 逆矩阵计算
 * 4. 点变换
 */

import { describe, it, expect } from 'vitest';
import { Matrix, Vector } from '../index';

describe('Matrix', () => {
  describe('单位矩阵', () => {
    it('应该创建单位矩阵', () => {
      const m = Matrix.identity();

      expect(m.a).toBe(1);
      expect(m.b).toBe(0);
      expect(m.c).toBe(0);
      expect(m.d).toBe(1);
      expect(m.e).toBe(0);
      expect(m.f).toBe(0);
    });

    it('单位矩阵变换点应该不变', () => {
      const m = Matrix.identity();
      const p = new Vector(5, 10);
      const result = m.transformPoint(p);

      expect(result.x).toBe(5);
      expect(result.y).toBe(10);
    });
  });

  describe('平移变换', () => {
    it('应该正确平移点', () => {
      const m = Matrix.identity().translate(10, 20);
      const p = new Vector(5, 5);
      const result = m.transformPoint(p);

      expect(result.x).toBe(15);
      expect(result.y).toBe(25);
    });

    it('负值平移应该正确工作', () => {
      const m = Matrix.identity().translate(-5, -10);
      const p = new Vector(10, 15);
      const result = m.transformPoint(p);

      expect(result.x).toBe(5);
      expect(result.y).toBe(5);
    });
  });

  describe('缩放变换', () => {
    it('应该正确缩放点', () => {
      const m = Matrix.identity().scale(2, 3);
      const p = new Vector(4, 5);
      const result = m.transformPoint(p);

      expect(result.x).toBe(8);
      expect(result.y).toBe(15);
    });

    it('零缩放应该将点变为原点', () => {
      const m = Matrix.identity().scale(0, 0);
      const p = new Vector(100, 200);
      const result = m.transformPoint(p);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('旋转变换', () => {
    it('90度旋转应该交换并反转坐标', () => {
      const m = Matrix.identity().rotate(Math.PI / 2);
      const p = new Vector(1, 0);
      const result = m.transformPoint(p);

      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(1, 5);
    });

    it('180度旋转应该反转坐标', () => {
      const m = Matrix.identity().rotate(Math.PI);
      const p = new Vector(1, 1);
      const result = m.transformPoint(p);

      expect(result.x).toBeCloseTo(-1, 5);
      expect(result.y).toBeCloseTo(-1, 5);
    });

    it('360度旋转应该回到原点', () => {
      const m = Matrix.identity().rotate(Math.PI * 2);
      const p = new Vector(5, 10);
      const result = m.transformPoint(p);

      expect(result.x).toBeCloseTo(5, 5);
      expect(result.y).toBeCloseTo(10, 5);
    });
  });

  describe('复合变换', () => {
    it('应该正确组合平移和缩放', () => {
      const m = Matrix.identity().translate(10, 20).scale(2, 2);
      const p = new Vector(5, 5);
      const result = m.transformPoint(p);

      // 矩阵变换顺序是从右到左：先缩放 再平移
      // 先缩放 (5*2, 5*2) = (10, 10)
      // 再平移 (10+10, 10+20) = (20, 30)
      expect(result.x).toBe(20);
      expect(result.y).toBe(30);
    });

    it('变换顺序应该影响结果', () => {
      const m1 = Matrix.identity().scale(2, 2).translate(10, 20);
      const m2 = Matrix.identity().translate(10, 20).scale(2, 2);
      const p = new Vector(0, 0);

      const result1 = m1.transformPoint(p);
      const result2 = m2.transformPoint(p);

      expect(result1.x).not.toBe(result2.x);
      expect(result1.y).not.toBe(result2.y);
    });
  });

  describe('逆矩阵', () => {
    it('单位矩阵的逆应该是自己', () => {
      const m = Matrix.identity();
      const inv = m.invert();

      expect(inv.a).toBe(1);
      expect(inv.d).toBe(1);
      expect(inv.e).toBe(0);
      expect(inv.f).toBe(0);
    });

    it('平移的逆应该反向平移', () => {
      const m = Matrix.identity().translate(10, 20);
      const inv = m.invert();
      const p = new Vector(0, 0);

      const forward = m.transformPoint(p);
      const backward = inv.transformPoint(forward);

      expect(backward.x).toBeCloseTo(0, 5);
      expect(backward.y).toBeCloseTo(0, 5);
    });

    it('应该支持逆变换往返', () => {
      const m = Matrix.identity().translate(5, 10).scale(2, 3).rotate(Math.PI / 4);
      const inv = m.invert();
      const p = new Vector(100, 200);

      const forward = m.transformPoint(p);
      const backward = inv.transformPoint(forward);

      expect(backward.x).toBeCloseTo(p.x, 5);
      expect(backward.y).toBeCloseTo(p.y, 5);
    });
  });

  describe('矩阵乘法', () => {
    it('与单位矩阵相乘应该不变', () => {
      const m1 = Matrix.identity().translate(5, 10);
      const m2 = Matrix.identity();
      const result = m1.multiply(m2);

      expect(result.e).toBe(5);
      expect(result.f).toBe(10);
    });

    it('矩阵乘法应该组合变换', () => {
      const translate = Matrix.identity().translate(10, 0);
      const scale = Matrix.identity().scale(2, 2);
      const combined = translate.multiply(scale);

      const p = new Vector(5, 5);
      const result = combined.transformPoint(p);

      // translate.multiply(scale) 表示先 scale 再 translate
      expect(result.x).toBe(20); // (5*2) + 10
      expect(result.y).toBe(10); // 5*2
    });
  });

  describe('矩阵克隆', () => {
    it('应该正确克隆矩阵', () => {
      const m1 = Matrix.identity().translate(5, 10).scale(2, 3);
      const m2 = m1.clone();

      expect(m2.a).toBe(m1.a);
      expect(m2.b).toBe(m1.b);
      expect(m2.c).toBe(m1.c);
      expect(m2.d).toBe(m1.d);
      expect(m2.e).toBe(m1.e);
      expect(m2.f).toBe(m1.f);

      // 修改克隆不应影响原矩阵
      m2.e = 100;
      m2.f = 200;
      expect(m1.e).not.toBe(m2.e);
      expect(m1.f).not.toBe(m2.f);
    });
  });
});
