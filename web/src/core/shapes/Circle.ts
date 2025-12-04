/**
 * 圆形图形
 */

import { Shape, type ShapeStyle } from './Shape';
import { Vector, AABB } from '../math';

export interface CircleOptions {
  id?: string;
  name?: string;
  x?: number;
  y?: number;
  radius?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  style?: ShapeStyle;
}

export class Circle extends Shape {
  radius: number;

  constructor(options: CircleOptions = {}) {
    super(options);
    this.name = options.name || 'Circle';
    this.radius = options.radius ?? 50;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.closePath();

    if (this.style.fillStyle) {
      ctx.fill();
    }
    if (this.style.strokeStyle) {
      ctx.stroke();
    }
  }

  hitTest(worldPoint: Vector): boolean {
    const localPoint = this.worldToLocal(worldPoint);
    return localPoint.length() <= this.radius;
  }

  getBoundingBox(): AABB {
    return new AABB(-this.radius, -this.radius, this.radius, this.radius);
  }

  clone(): Circle {
    return new Circle({
      x: this.x,
      y: this.y,
      radius: this.radius,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: { ...this.style }
    });
  }

  toJSON() {
    return {
      type: 'Circle',
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      radius: this.radius,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: this.style,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex
    };
  }

  static fromJSON(json: unknown): Circle {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid Circle JSON data');
    }
    
    const data = json as Record<string, unknown>;
    
    // 验证必要字段
    const options: CircleOptions = {
      id: typeof data.id === 'string' ? data.id : undefined,
      name: typeof data.name === 'string' ? data.name : undefined,
      x: typeof data.x === 'number' ? data.x : 0,
      y: typeof data.y === 'number' ? data.y : 0,
      radius: typeof data.radius === 'number' ? data.radius : 50,
      rotation: typeof data.rotation === 'number' ? data.rotation : 0,
      scaleX: typeof data.scaleX === 'number' ? data.scaleX : 1,
      scaleY: typeof data.scaleY === 'number' ? data.scaleY : 1,
      style: data.style && typeof data.style === 'object' ? data.style as ShapeStyle : undefined
    };
    
    return new Circle(options);
  }
}
