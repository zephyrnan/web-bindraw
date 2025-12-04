/**
 * 图形基类
 * 所有可绘制对象的抽象基类
 *
 * 面试考点：
 * 1. 如何扩展新的图形？—— 继承基类，实现 draw 和 hitTest 方法
 * 2. 为什么用 OOP？—— 便于扩展和维护，符合开闭原则
 */

import { v4 as uuidv4 } from 'uuid';
import { Vector, Matrix, AABB } from '../math';

/** 图形样式 */
export interface ShapeStyle {
  fillStyle?: string | null;
  strokeStyle?: string | null;
  lineWidth?: number;
  opacity?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  lineCap?: CanvasLineCap;
  lineJoin?: CanvasLineJoin;
  lineDash?: number[];
}

/** 默认样式 */
const DEFAULT_STYLE: ShapeStyle = {
  fillStyle: '#3498db',
  strokeStyle: '#2980b9',
  lineWidth: 2,
  opacity: 1
};

/**
 * 图形基类
 */
export abstract class Shape {
  /** 唯一标识 */
  readonly id: string;

  /** 名称（用于图层列表显示） */
  name: string;

  /** 位置 */
  x: number = 0;
  y: number = 0;

  /** 旋转角度（弧度） */
  rotation: number = 0;

  /** 缩放 */
  scaleX: number = 1;
  scaleY: number = 1;

  /** 样式 */
  style: ShapeStyle;

  /** 是否可见 */
  visible: boolean = true;

  /** 是否锁定 */
  locked: boolean = false;

  /** 是否被选中 */
  selected: boolean = false;

  /** 父级图形（用于Group） */
  parent: Shape | null = null;

  /** z-index 层级 */
  zIndex: number = 0;

  constructor(options: Partial<Shape> = {}) {
    this.id = options.id || uuidv4();
    this.name = options.name || this.constructor.name;
    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.rotation = options.rotation ?? 0;
    this.scaleX = options.scaleX ?? 1;
    this.scaleY = options.scaleY ?? 1;
    this.style = { ...DEFAULT_STYLE, ...options.style };
    this.visible = options.visible ?? true;
    this.locked = options.locked ?? false;
    this.zIndex = options.zIndex ?? 0;
  }

  /**
   * 获取本地变换矩阵
   */
  getLocalMatrix(): Matrix {
    return Matrix.identity()
      .translate(this.x, this.y)
      .rotate(this.rotation)
      .scale(this.scaleX, this.scaleY);
  }

  /**
   * 获取世界变换矩阵（包含父级变换）
   */
  getWorldMatrix(): Matrix {
    const localMatrix = this.getLocalMatrix();
    if (this.parent) {
      return this.parent.getWorldMatrix().multiply(localMatrix);
    }
    return localMatrix;
  }

  /**
   * 获取逆世界矩阵
   */
  getInverseWorldMatrix(): Matrix {
    return this.getWorldMatrix().invert();
  }

  /**
   * 将世界坐标转换���本地坐标
   */
  worldToLocal(point: Vector): Vector {
    return this.getInverseWorldMatrix().transformPoint(point);
  }

  /**
   * 将本地坐标转换为世界坐标
   */
  localToWorld(point: Vector): Vector {
    return this.getWorldMatrix().transformPoint(point);
  }

  /**
   * 绘制图形（子类必须实现）
   * @param ctx Canvas 2D 上下文
   */
  abstract draw(ctx: CanvasRenderingContext2D): void;

  /**
   * 点击测试（子类必须实现）
   * 判断某个点（世界坐标）是否在图形内
   */
  abstract hitTest(point: Vector): boolean;

  /**
   * 获取本地坐标系的包围盒
   */
  abstract getBoundingBox(): AABB;

  /**
   * 获取世界坐标系的包围盒
   */
  getWorldBoundingBox(): AABB {
    const bbox = this.getBoundingBox();
    const matrix = this.getWorldMatrix();
    const corners = bbox.getCorners().map(c => matrix.transformPoint(c));
    return AABB.fromPoints(corners);
  }

  /**
   * 克隆图形（子类必须实现）
   */
  abstract clone(): Shape;

  /**
   * 序列化为JSON
   */
  abstract toJSON(): any;

  /**
   * 应用变换并绘制
   */
  render(ctx: CanvasRenderingContext2D): void {
    if (!this.visible) return;

    ctx.save();

    // 应用变换
    const matrix = this.getLocalMatrix();
    matrix.applyToContext(ctx);

    // 应用样式
    this.applyStyle(ctx);

    // 绘制
    this.draw(ctx);

    // 如果被选中，绘制选中框
    if (this.selected && !this.locked) {
      this.drawSelectionBox(ctx);
    }

    ctx.restore();
  }

  /**
   * 应用样式到上下文
   */
  protected applyStyle(ctx: CanvasRenderingContext2D): void {
    const style = this.style;

    ctx.globalAlpha = style.opacity ?? 1;

    if (style.fillStyle) {
      ctx.fillStyle = style.fillStyle;
    }

    if (style.strokeStyle) {
      ctx.strokeStyle = style.strokeStyle;
    }

    ctx.lineWidth = style.lineWidth ?? 1;

    if (style.lineCap) {
      ctx.lineCap = style.lineCap;
    }

    if (style.lineJoin) {
      ctx.lineJoin = style.lineJoin;
    }

    if (style.lineDash) {
      ctx.setLineDash(style.lineDash);
    }

    if (style.shadowBlur) {
      ctx.shadowBlur = style.shadowBlur;
      ctx.shadowColor = style.shadowColor ?? 'rgba(0,0,0,0.3)';
      ctx.shadowOffsetX = style.shadowOffsetX ?? 0;
      ctx.shadowOffsetY = style.shadowOffsetY ?? 0;
    }
  }

  /**
   * 绘制选中框
   */
  protected drawSelectionBox(ctx: CanvasRenderingContext2D): void {
    const bbox = this.getBoundingBox();

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); // 重置变换

    // 转换到世界坐标
    const worldMatrix = this.getWorldMatrix();
    const corners = bbox.getCorners().map(c => worldMatrix.transformPoint(c));

    ctx.strokeStyle = '#2196F3';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 3]);

    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      ctx.lineTo(corners[i].x, corners[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }

  /**
   * 移动图形
   */
  move(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
  }

  /**
   * 设置位置
   */
  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * 旋转
   */
  rotate(angle: number): void {
    this.rotation += angle;
  }

  /**
   * 设置旋转角度
   */
  setRotation(angle: number): void {
    this.rotation = angle;
  }

  /**
   * 缩放
   */
  scale(sx: number, sy: number = sx): void {
    this.scaleX *= sx;
    this.scaleY *= sy;
  }

  /**
   * 设置缩放
   */
  setScale(sx: number, sy: number = sx): void {
    this.scaleX = sx;
    this.scaleY = sy;
  }
}
