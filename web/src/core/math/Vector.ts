/**
 * 向量类
 * 用于表示2D点和向量运算
 */
export class Vector {
  constructor(public x: number = 0, public y: number = 0) {}

  /** 向量加法 */
  add(v: Vector): Vector {
    return new Vector(this.x + v.x, this.y + v.y);
  }

  /** 向量减法 */
  sub(v: Vector): Vector {
    return new Vector(this.x - v.x, this.y - v.y);
  }

  /** 向量减法（别名） */
  subtract(v: Vector): Vector {
    return this.sub(v);
  }

  /** 标量乘法 */
  mul(scalar: number): Vector {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  /** 标量乘法（别名） */
  multiply(scalar: number): Vector {
    return this.mul(scalar);
  }

  /** 标量除法 */
  divide(scalar: number): Vector {
    if (scalar === 0) {
      throw new Error('Cannot divide by zero');
    }
    return new Vector(this.x / scalar, this.y / scalar);
  }

  /** 向量长度 */
  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  /** 归一化 */
  normalize(): Vector {
    const len = this.length();
    if (len === 0) return new Vector(0, 0);
    return new Vector(this.x / len, this.y / len);
  }

  /** 点积 */
  dot(v: Vector): number {
    return this.x * v.x + this.y * v.y;
  }

  /** 叉积（2D返回标量） */
  cross(v: Vector): number {
    return this.x * v.y - this.y * v.x;
  }

  /** 计算到另一个向量的距离 */
  distanceTo(v: Vector): number {
    return this.sub(v).length();
  }

  /** 计算到另一个向量的角度（弧度） */
  angleTo(v: Vector): number {
    return Math.atan2(v.y - this.y, v.x - this.x);
  }

  /** 克隆 */
  clone(): Vector {
    return new Vector(this.x, this.y);
  }

  /** 比较两个向量是否相等 */
  equals(v: Vector): boolean {
    return this.x === v.x && this.y === v.y;
  }

  /** 从对象创建 */
  static from(obj: { x: number; y: number }): Vector {
    return new Vector(obj.x, obj.y);
  }

  /** 两点之间的中点 */
  static midpoint(a: Vector, b: Vector): Vector {
    return new Vector((a.x + b.x) / 2, (a.y + b.y) / 2);
  }

  /** 创建零向量 */
  static zero(): Vector {
    return new Vector(0, 0);
  }

  /** 创建单位向量 */
  static one(): Vector {
    return new Vector(1, 1);
  }
}
