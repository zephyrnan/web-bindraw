/**
 * 3x3 变换矩阵
 * 用于处理平移、旋转、缩放
 *
 * 矩阵格式:
 * | a  c  e |   | scaleX  skewX   translateX |
 * | b  d  f | = | skewY   scaleY  translateY |
 * | 0  0  1 |   | 0       0       1          |
 *
 * 面试考点：矩阵变换是图形编辑器的核心数学基础
 */

import { Vector } from './Vector';

export class Matrix {
  constructor(
    public a: number = 1,  // scaleX
    public b: number = 0,  // skewY
    public c: number = 0,  // skewX
    public d: number = 1,  // scaleY
    public e: number = 0,  // translateX
    public f: number = 0   // translateY
  ) {}

  /** 创建单位矩阵 */
  static identity(): Matrix {
    return new Matrix(1, 0, 0, 1, 0, 0);
  }

  /** 创建平移矩阵 */
  static translate(tx: number, ty: number): Matrix {
    return new Matrix(1, 0, 0, 1, tx, ty);
  }

  /** 创建缩放矩阵 */
  static scale(sx: number, sy: number = sx): Matrix {
    return new Matrix(sx, 0, 0, sy, 0, 0);
  }

  /**
   * 创建旋转矩阵
   * 面试考点：旋转矩阵公式
   * | cos(θ)  -sin(θ)  0 |
   * | sin(θ)   cos(θ)  0 |
   * | 0        0       1 |
   */
  static rotate(angle: number): Matrix {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return new Matrix(cos, sin, -sin, cos, 0, 0);
  }

  /**
   * 矩阵乘法
   * 面试考点：组合变换时矩阵��法的顺序很重要
   *
   * | a1 c1 e1 |   | a2 c2 e2 |
   * | b1 d1 f1 | × | b2 d2 f2 |
   * | 0  0  1  |   | 0  0  1  |
   */
  multiply(m: Matrix): Matrix {
    return new Matrix(
      this.a * m.a + this.c * m.b,       // a
      this.b * m.a + this.d * m.b,       // b
      this.a * m.c + this.c * m.d,       // c
      this.b * m.c + this.d * m.d,       // d
      this.a * m.e + this.c * m.f + this.e, // e
      this.b * m.e + this.d * m.f + this.f  // f
    );
  }

  /**
   * 矩阵求逆
   * 面试考点：屏幕坐标转世界坐标必须用逆矩阵
   */
  invert(): Matrix {
    const det = this.a * this.d - this.b * this.c;
    if (det === 0) {
      throw new Error('Matrix is not invertible');
    }
    const invDet = 1 / det;
    return new Matrix(
      this.d * invDet,
      -this.b * invDet,
      -this.c * invDet,
      this.a * invDet,
      (this.c * this.f - this.d * this.e) * invDet,
      (this.b * this.e - this.a * this.f) * invDet
    );
  }

  /**
   * 变换点坐标
   * 将点从一个坐标系变换到另一个坐标系
   */
  transformPoint(point: Vector): Vector {
    return new Vector(
      this.a * point.x + this.c * point.y + this.e,
      this.b * point.x + this.d * point.y + this.f
    );
  }

  /**
   * 变换向量（不包含平移）
   * 用于变换方向向量
   */
  transformVector(v: Vector): Vector {
    return new Vector(
      this.a * v.x + this.c * v.y,
      this.b * v.x + this.d * v.y
    );
  }

  /** 应用平移 */
  translate(tx: number, ty: number): Matrix {
    return this.multiply(Matrix.translate(tx, ty));
  }

  /** 应用缩放 */
  scale(sx: number, sy: number = sx): Matrix {
    return this.multiply(Matrix.scale(sx, sy));
  }

  /** 应用旋转 */
  rotate(angle: number): Matrix {
    return this.multiply(Matrix.rotate(angle));
  }

  /**
   * 绕指定点旋转
   * 面试考点：绕任意点旋转 = 平移到原点 → 旋转 → 平移回去
   */
  rotateAround(angle: number, cx: number, cy: number): Matrix {
    return this
      .translate(cx, cy)
      .rotate(angle)
      .translate(-cx, -cy);
  }

  /**
   * 绕指定点缩放
   */
  scaleAround(sx: number, sy: number, cx: number, cy: number): Matrix {
    return this
      .translate(cx, cy)
      .scale(sx, sy)
      .translate(-cx, -cy);
  }

  /** 应用到Canvas上下文 */
  applyToContext(ctx: CanvasRenderingContext2D): void {
    ctx.transform(this.a, this.b, this.c, this.d, this.e, this.f);
  }

  /** 设置Canvas上下文的变换矩阵 */
  setToContext(ctx: CanvasRenderingContext2D): void {
    ctx.setTransform(this.a, this.b, this.c, this.d, this.e, this.f);
  }

  /** 克隆 */
  clone(): Matrix {
    return new Matrix(this.a, this.b, this.c, this.d, this.e, this.f);
  }

  /** 获取缩放分量 */
  getScale(): { x: number; y: number } {
    return {
      x: Math.sqrt(this.a * this.a + this.b * this.b),
      y: Math.sqrt(this.c * this.c + this.d * this.d)
    };
  }

  /** 获取旋转角度（弧度） */
  getRotation(): number {
    return Math.atan2(this.b, this.a);
  }

  /** 获取平移分量 */
  getTranslation(): Vector {
    return new Vector(this.e, this.f);
  }

  /** 转换为数组 */
  toArray(): number[] {
    return [this.a, this.b, this.c, this.d, this.e, this.f];
  }

  /** 从数组创建 */
  static fromArray(arr: number[]): Matrix {
    return new Matrix(arr[0], arr[1], arr[2], arr[3], arr[4], arr[5]);
  }
}
