/**
 * AABB ���围盒（Axis-Aligned Bounding Box）
 * 用于快速碰撞检测
 *
 * 面试考点：AABB是最基础的碰撞检测方法
 * 优点：计算简单快速
 * 缺点：对旋转图形不够精确
 */

import { Vector } from './Vector';

export class AABB {
  constructor(
    public minX: number = 0,
    public minY: number = 0,
    public maxX: number = 0,
    public maxY: number = 0
  ) {}

  /** 从中心点和尺寸创建 */
  static fromCenter(cx: number, cy: number, width: number, height: number): AABB {
    const halfW = width / 2;
    const halfH = height / 2;
    return new AABB(cx - halfW, cy - halfH, cx + halfW, cy + halfH);
  }

  /** 从左上角和尺寸创建 */
  static fromTopLeft(x: number, y: number, width: number, height: number): AABB {
    return new AABB(x, y, x + width, y + height);
  }

  /** 从点数组创建（计算包围所有点的最小矩形） */
  static fromPoints(points: Vector[]): AABB {
    if (points.length === 0) {
      return new AABB();
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const p of points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }

    return new AABB(minX, minY, maxX, maxY);
  }

  /** 宽度 */
  get width(): number {
    return this.maxX - this.minX;
  }

  /** 高度 */
  get height(): number {
    return this.maxY - this.minY;
  }

  /** 中心点 */
  get center(): Vector {
    return new Vector(
      (this.minX + this.maxX) / 2,
      (this.minY + this.maxY) / 2
    );
  }

  /** 左上角 */
  get topLeft(): Vector {
    return new Vector(this.minX, this.minY);
  }

  /** 右下角 */
  get bottomRight(): Vector {
    return new Vector(this.maxX, this.maxY);
  }

  /**
   * 点是否在包围盒内
   * 面试考点：最基础的碰撞检测
   */
  containsPoint(point: Vector): boolean {
    return point.x >= this.minX && point.x <= this.maxX &&
           point.y >= this.minY && point.y <= this.maxY;
  }

  /**
   * 两个包围盒是否相交
   * 面试考点：分离轴定理的简化版本
   * 如果在任何一个轴上没有重叠，则不相交
   */
  intersects(other: AABB): boolean {
    return this.minX <= other.maxX && this.maxX >= other.minX &&
           this.minY <= other.maxY && this.maxY >= other.minY;
  }

  /**
   * 是否完全包含另一个包围盒
   */
  contains(other: AABB): boolean {
    return this.minX <= other.minX && this.maxX >= other.maxX &&
           this.minY <= other.minY && this.maxY >= other.maxY;
  }

  /**
   * 合并两个包围盒
   * 返回包含两者的最小包围盒
   */
  merge(other: AABB): AABB {
    return new AABB(
      Math.min(this.minX, other.minX),
      Math.min(this.minY, other.minY),
      Math.max(this.maxX, other.maxX),
      Math.max(this.maxY, other.maxY)
    );
  }

  /**
   * 扩展包围盒以包含某个点
   */
  expandToInclude(point: Vector): AABB {
    return new AABB(
      Math.min(this.minX, point.x),
      Math.min(this.minY, point.y),
      Math.max(this.maxX, point.x),
      Math.max(this.maxY, point.y)
    );
  }

  /**
   * 向外扩展指定的边距
   */
  expand(margin: number): AABB {
    return new AABB(
      this.minX - margin,
      this.minY - margin,
      this.maxX + margin,
      this.maxY + margin
    );
  }

  /**
   * 移动包围盒
   */
  translate(dx: number, dy: number): AABB {
    return new AABB(
      this.minX + dx,
      this.minY + dy,
      this.maxX + dx,
      this.maxY + dy
    );
  }

  /**
   * 获取四个顶点
   */
  getCorners(): Vector[] {
    return [
      new Vector(this.minX, this.minY), // 左上
      new Vector(this.maxX, this.minY), // 右上
      new Vector(this.maxX, this.maxY), // 右下
      new Vector(this.minX, this.maxY)  // 左下
    ];
  }

  /**
   * 克隆
   */
  clone(): AABB {
    return new AABB(this.minX, this.minY, this.maxX, this.maxY);
  }

  /**
   * 是否有效（非空）
   */
  isValid(): boolean {
    return this.width > 0 && this.height > 0;
  }
}
