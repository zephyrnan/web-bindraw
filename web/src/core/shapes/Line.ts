/**
 * 线条/折线图形
 */

import { Shape, type ShapeStyle } from './Shape';
import { Vector, AABB } from '../math';
import { PathSmoothing } from '../utils/PathSmoothing';

export interface LineOptions {
  id?: string;
  name?: string;
  x?: number;
  y?: number;
  points?: Vector[];
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  style?: ShapeStyle;
  closed?: boolean;
  smooth?: boolean;
  smoothAlgorithm?: 'catmullRom' | 'bezier' | 'simple';
}

export class Line extends Shape {
  points: Vector[];
  closed: boolean;
  smooth: boolean;
  smoothAlgorithm: 'catmullRom' | 'bezier' | 'simple';

  constructor(options: LineOptions = {}) {
    super(options);
    this.name = options.name || 'Line';
    this.points = options.points?.map(p => new Vector(p.x, p.y)) || [
      new Vector(0, 0),
      new Vector(100, 0)
    ];
    this.closed = options.closed ?? false;
    this.smooth = options.smooth ?? false;
    this.smoothAlgorithm = options.smoothAlgorithm ?? 'catmullRom';
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (this.points.length < 2) return;

    ctx.beginPath();

    if (this.smooth && this.points.length > 2) {
      this.drawSmoothPath(ctx);
    } else {
      ctx.moveTo(this.points[0].x, this.points[0].y);
      for (let i = 1; i < this.points.length; i++) {
        ctx.lineTo(this.points[i].x, this.points[i].y);
      }
    }

    if (this.closed) {
      ctx.closePath();
      if (this.style.fillStyle) {
        ctx.fill();
      }
    }

    if (this.style.strokeStyle) {
      ctx.stroke();
    }
  }

  /**
   * 绘制平滑路径
   */
  private drawSmoothPath(ctx: CanvasRenderingContext2D): void {
    const pts = this.points;

    if (this.smoothAlgorithm === 'catmullRom') {
      // Catmull-Rom 样条平滑
      const smoothed = PathSmoothing.catmullRom(pts, 8);
      ctx.moveTo(smoothed[0].x, smoothed[0].y);
      for (let i = 1; i < smoothed.length; i++) {
        ctx.lineTo(smoothed[i].x, smoothed[i].y);
      }
    } else if (this.smoothAlgorithm === 'bezier') {
      // 三次贝塞尔曲线平滑
      const { points, controlPoints } = PathSmoothing.bezierSmooth(pts, 0.3);
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 0; i < controlPoints.length; i++) {
        const cp = controlPoints[i];
        const end = points[i + 1];
        ctx.bezierCurveTo(
          cp.cp1.x, cp.cp1.y,
          cp.cp2.x, cp.cp2.y,
          end.x, end.y
        );
      }
    } else {
      // 简单二次贝塞尔（原有算法）
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) / 2;
        const yc = (pts[i].y + pts[i + 1].y) / 2;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    }
  }

  hitTest(worldPoint: Vector): boolean {
    const localPoint = this.worldToLocal(worldPoint);
    const threshold = (this.style.lineWidth ?? 2) + 5;

    for (let i = 0; i < this.points.length - 1; i++) {
      if (this.pointToSegmentDistance(localPoint, this.points[i], this.points[i + 1]) <= threshold) {
        return true;
      }
    }

    if (this.closed && this.points.length > 2) {
      if (this.pointToSegmentDistance(localPoint, this.points[this.points.length - 1], this.points[0]) <= threshold) {
        return true;
      }
    }

    return false;
  }

  private pointToSegmentDistance(point: Vector, start: Vector, end: Vector): number {
    const line = end.sub(start);
    const len2 = line.x * line.x + line.y * line.y;

    if (len2 === 0) return point.distanceTo(start);

    let t = point.sub(start).dot(line) / len2;
    t = Math.max(0, Math.min(1, t));

    const closest = new Vector(
      start.x + t * line.x,
      start.y + t * line.y
    );

    return point.distanceTo(closest);
  }

  getBoundingBox(): AABB {
    return AABB.fromPoints(this.points);
  }

  addPoint(point: Vector): void {
    this.points.push(point);
  }

  updatePoint(index: number, point: Vector): void {
    if (index >= 0 && index < this.points.length) {
      this.points[index] = point;
    }
  }

  clone(): Line {
    return new Line({
      x: this.x,
      y: this.y,
      points: this.points.map(p => p.clone()),
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: { ...this.style },
      closed: this.closed,
      smooth: this.smooth,
      smoothAlgorithm: this.smoothAlgorithm
    });
  }

  toJSON() {
    return {
      type: 'Line',
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      points: this.points.map(p => ({ x: p.x, y: p.y })),
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: this.style,
      closed: this.closed,
      smooth: this.smooth,
      smoothAlgorithm: this.smoothAlgorithm,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex
    };
  }

  static fromJSON(json: unknown): Line {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid Line JSON data');
    }
    
    const data = json as Record<string, unknown>;
    
    // 验证和转换 points 数组
    let points: Vector[] | undefined;
    if (Array.isArray(data.points)) {
      points = data.points
        .filter((p): p is { x: number; y: number } => 
          p && typeof p === 'object' && 
          typeof (p as any).x === 'number' && 
          typeof (p as any).y === 'number'
        )
        .map(p => new Vector(p.x, p.y));
    }
    
    const options: LineOptions = {
      id: typeof data.id === 'string' ? data.id : undefined,
      name: typeof data.name === 'string' ? data.name : undefined,
      x: typeof data.x === 'number' ? data.x : 0,
      y: typeof data.y === 'number' ? data.y : 0,
      points,
      rotation: typeof data.rotation === 'number' ? data.rotation : 0,
      scaleX: typeof data.scaleX === 'number' ? data.scaleX : 1,
      scaleY: typeof data.scaleY === 'number' ? data.scaleY : 1,
      closed: typeof data.closed === 'boolean' ? data.closed : false,
      smooth: typeof data.smooth === 'boolean' ? data.smooth : false,
      smoothAlgorithm: ['catmullRom', 'bezier', 'simple'].includes(data.smoothAlgorithm as string) 
        ? data.smoothAlgorithm as 'catmullRom' | 'bezier' | 'simple' 
        : 'catmullRom',
      style: data.style && typeof data.style === 'object' ? data.style as ShapeStyle : undefined
    };
    
    return new Line(options);
  }
}
