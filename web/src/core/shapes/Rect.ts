/**
 * 矩形图形
 */

import { Shape, type ShapeStyle } from './Shape';
import { Vector, AABB } from '../math';

export interface RectOptions {
  id?: string;
  name?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  style?: ShapeStyle;
  cornerRadius?: number;
}

export class Rect extends Shape {
  width: number;
  height: number;
  cornerRadius: number;

  constructor(options: RectOptions = {}) {
    super(options);
    this.name = options.name || 'Rectangle';
    this.width = options.width ?? 100;
    this.height = options.height ?? 100;
    this.cornerRadius = options.cornerRadius ?? 0;
  }

  /**
   * 绘制矩形
   */
  draw(ctx: CanvasRenderingContext2D): void {
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    ctx.beginPath();

    if (this.cornerRadius > 0) {
      const r = Math.min(this.cornerRadius, halfW, halfH);
      ctx.moveTo(-halfW + r, -halfH);
      ctx.lineTo(halfW - r, -halfH);
      ctx.arcTo(halfW, -halfH, halfW, -halfH + r, r);
      ctx.lineTo(halfW, halfH - r);
      ctx.arcTo(halfW, halfH, halfW - r, halfH, r);
      ctx.lineTo(-halfW + r, halfH);
      ctx.arcTo(-halfW, halfH, -halfW, halfH - r, r);
      ctx.lineTo(-halfW, -halfH + r);
      ctx.arcTo(-halfW, -halfH, -halfW + r, -halfH, r);
    } else {
      ctx.rect(-halfW, -halfH, this.width, this.height);
    }

    ctx.closePath();

    if (this.style.fillStyle) {
      ctx.fill();
    }
    if (this.style.strokeStyle) {
      ctx.stroke();
    }
  }

  /**
   * 碰撞检测
   * 将世界坐标点转换到本地坐标系后判断
   */
  hitTest(worldPoint: Vector): boolean {
    const localPoint = this.worldToLocal(worldPoint);
    const halfW = this.width / 2;
    const halfH = this.height / 2;

    return localPoint.x >= -halfW && localPoint.x <= halfW &&
           localPoint.y >= -halfH && localPoint.y <= halfH;
  }

  /**
   * 获取本地坐标系的包围盒
   */
  getBoundingBox(): AABB {
    const halfW = this.width / 2;
    const halfH = this.height / 2;
    return new AABB(-halfW, -halfH, halfW, halfH);
  }

  clone(): Rect {
    return new Rect({
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: { ...this.style },
      cornerRadius: this.cornerRadius
    });
  }

  toJSON() {
    return {
      type: 'Rect',
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: this.style,
      cornerRadius: this.cornerRadius,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex
    };
  }

  static fromJSON(json: unknown): Rect {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid Rect JSON data');
    }
    
    const data = json as Record<string, unknown>;
    
    const options: RectOptions = {
      id: typeof data.id === 'string' ? data.id : undefined,
      name: typeof data.name === 'string' ? data.name : undefined,
      x: typeof data.x === 'number' ? data.x : 0,
      y: typeof data.y === 'number' ? data.y : 0,
      width: typeof data.width === 'number' ? data.width : 100,
      height: typeof data.height === 'number' ? data.height : 100,
      rotation: typeof data.rotation === 'number' ? data.rotation : 0,
      scaleX: typeof data.scaleX === 'number' ? data.scaleX : 1,
      scaleY: typeof data.scaleY === 'number' ? data.scaleY : 1,
      cornerRadius: typeof data.cornerRadius === 'number' ? data.cornerRadius : 0,
      style: data.style && typeof data.style === 'object' ? data.style as ShapeStyle : undefined
    };
    
    return new Rect(options);
  }
}
