/**
 * 路径平滑算法工具类
 * 提供多种笔迹平滑算法
 */

import { Vector } from '../math';

export class PathSmoothing {
  /**
   * Ramer-Douglas-Peucker 算法
   * 用于简化路径，移除冗余点
   *
   * @param points 原始点集
   * @param epsilon 容差值，越大简化程度越高
   */
  static simplify(points: Vector[], epsilon: number = 2): Vector[] {
    if (points.length < 3) return points;

    const dmax = { value: 0, index: 0 };
    const end = points.length - 1;

    // 找到距离首尾连线最远的点
    for (let i = 1; i < end; i++) {
      const d = this.perpendicularDistance(points[i], points[0], points[end]);
      if (d > dmax.value) {
        dmax.value = d;
        dmax.index = i;
      }
    }

    // 如果最大距离大于阈值，递归简化
    if (dmax.value > epsilon) {
      const left = this.simplify(points.slice(0, dmax.index + 1), epsilon);
      const right = this.simplify(points.slice(dmax.index), epsilon);
      return [...left.slice(0, -1), ...right];
    }

    return [points[0], points[end]];
  }

  /**
   * 计算点到线段的垂直距离
   */
  private static perpendicularDistance(point: Vector, lineStart: Vector, lineEnd: Vector): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const norm = Math.sqrt(dx * dx + dy * dy);

    if (norm === 0) return point.distanceTo(lineStart);

    return Math.abs(dy * point.x - dx * point.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / norm;
  }

  /**
   * Catmull-Rom 样条平滑
   * 生成通过所有控制点的光滑曲线
   *
   * @param points 控制点
   * @param segments 每两个点之间的插值段数
   */
  static catmullRom(points: Vector[], segments: number = 10): Vector[] {
    if (points.length < 2) return points;
    if (points.length === 2) return points;

    const result: Vector[] = [points[0]];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i === 0 ? points[0] : points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i === points.length - 2 ? points[i + 1] : points[i + 2];

      for (let t = 0; t < segments; t++) {
        const u = t / segments;
        const pt = this.catmullRomPoint(p0, p1, p2, p3, u);
        result.push(pt);
      }
    }

    result.push(points[points.length - 1]);
    return result;
  }

  /**
   * Catmull-Rom 插值计算单个点
   */
  private static catmullRomPoint(p0: Vector, p1: Vector, p2: Vector, p3: Vector, t: number): Vector {
    const t2 = t * t;
    const t3 = t2 * t;

    const x = 0.5 * (
      2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
    );

    const y = 0.5 * (
      2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
    );

    return new Vector(x, y);
  }

  /**
   * 三次贝塞尔曲线平滑
   * 为每个点计算控制点，生成平滑的贝塞尔曲线
   *
   * @param points 原始点集
   * @param tension 张力，0-1，越大曲线越直
   */
  static bezierSmooth(points: Vector[], tension: number = 0.3): {
    points: Vector[],
    controlPoints: { cp1: Vector, cp2: Vector }[]
  } {
    if (points.length < 2) {
      return { points, controlPoints: [] };
    }

    const controlPoints: { cp1: Vector, cp2: Vector }[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = i === 0 ? points[i] : points[i - 1];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = i === points.length - 2 ? p2 : points[i + 2];

      // 计算控制点
      const cp1 = new Vector(
        p1.x + (p2.x - p0.x) * tension,
        p1.y + (p2.y - p0.y) * tension
      );

      const cp2 = new Vector(
        p2.x - (p3.x - p1.x) * tension,
        p2.y - (p3.y - p1.y) * tension
      );

      controlPoints.push({ cp1, cp2 });
    }

    return { points, controlPoints };
  }

  /**
   * 移动平均平滑
   * 简单快速的平滑方法
   *
   * @param points 原始点集
   * @param windowSize 窗口大小
   */
  static movingAverage(points: Vector[], windowSize: number = 3): Vector[] {
    if (points.length < windowSize) return points;

    const result: Vector[] = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < points.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(points.length, i + halfWindow + 1);
      const count = end - start;

      let sumX = 0, sumY = 0;
      for (let j = start; j < end; j++) {
        sumX += points[j].x;
        sumY += points[j].y;
      }

      result.push(new Vector(sumX / count, sumY / count));
    }

    return result;
  }

  /**
   * 组合平滑算法
   * 先简化，再平滑
   *
   * @param points 原始点集
   * @param simplifyEpsilon 简化容差
   * @param smoothSegments Catmull-Rom 插值段数
   */
  static combinedSmooth(
    points: Vector[],
    simplifyEpsilon: number = 2,
    smoothSegments: number = 8
  ): Vector[] {
    if (points.length < 2) return points;

    // 1. 先简化路径
    const simplified = this.simplify(points, simplifyEpsilon);

    // 2. 再进行 Catmull-Rom 平滑
    return this.catmullRom(simplified, smoothSegments);
  }

  /**
   * 自适应平滑
   * 根据点的密度自动调整平滑参数
   */
  static adaptiveSmooth(points: Vector[]): Vector[] {
    if (points.length < 3) return points;

    // 计算平均点间距
    let totalDist = 0;
    for (let i = 0; i < points.length - 1; i++) {
      totalDist += points[i].distanceTo(points[i + 1]);
    }
    const avgDist = totalDist / (points.length - 1);

    // 根据密度选择参数
    const epsilon = Math.max(1, avgDist * 0.5);
    const segments = avgDist < 5 ? 4 : avgDist < 10 ? 6 : 8;

    return this.combinedSmooth(points, epsilon, segments);
  }
}
