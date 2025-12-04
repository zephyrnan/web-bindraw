/**
 * 变换命令（缩放、旋转）
 *
 * 面试考点：
 * 1. 如何支持撤销重做？—— 命令模式，保存变换前后的状态
 * 2. 如何批量变换多个图形？—— 存储每个图形的状态映射
 * 3. 如何保证可逆性？—— execute 和 undo 互为逆操作
 */

import { Command } from './Command';
import type { Shape } from '../shapes';

/**
 * 图形状态快照
 */
interface ShapeState {
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
}

/**
 * 变换命令
 * 支持缩放、旋转等变换操作
 */
export class TransformCommand extends Command {
  readonly name = 'transform';
  readonly description?: string;

  private shapes: Shape[];
  private beforeStates: Map<Shape, ShapeState>;
  private afterStates: Map<Shape, ShapeState>;

  constructor(shapes: Shape[], beforeStates: Map<Shape, ShapeState>, afterStates: Map<Shape, ShapeState>) {
    super();
    this.shapes = shapes;
    this.beforeStates = beforeStates;
    this.afterStates = afterStates;
    this.description = `Transform ${shapes.length} shape(s)`;
  }

  execute(): void {
    this.applyStates(this.afterStates);
  }

  undo(): void {
    this.applyStates(this.beforeStates);
  }

  private applyStates(states: Map<Shape, ShapeState>): void {
    this.shapes.forEach(shape => {
      const state = states.get(shape);
      if (!state) return;

      shape.x = state.x;
      shape.y = state.y;

      if (state.width !== undefined && 'width' in shape) {
        (shape as any).width = state.width;
      }
      if (state.height !== undefined && 'height' in shape) {
        (shape as any).height = state.height;
      }
      if (state.rotation !== undefined && 'rotation' in shape) {
        (shape as any).rotation = state.rotation;
      }
      if (state.scaleX !== undefined && 'scaleX' in shape) {
        (shape as any).scaleX = state.scaleX;
      }
      if (state.scaleY !== undefined && 'scaleY' in shape) {
        (shape as any).scaleY = state.scaleY;
      }
    });
  }

  /**
   * 获取命令描述
   */
  getDescription(): string {
    return this.description || this.name;
  }
}

/**
 * 旋转命令
 * 专门用于旋转操作
 */
export class RotateCommand extends Command {
  readonly name = 'rotate';
  readonly description?: string;

  private shapes: Shape[];
  private angle: number; // 旋转角度（度）
  private pivot: { x: number; y: number }; // 旋转中心点
  private originalStates: Array<{ shape: Shape; x: number; y: number; rotation: number }>;

  constructor(shapes: Shape[], angle: number, pivot: { x: number; y: number }) {
    super();
    this.shapes = shapes;
    this.angle = angle;
    this.pivot = pivot;
    this.description = `Rotate ${shapes.length} shape(s) by ${angle}°`;

    // 保存原始状态
    this.originalStates = shapes.map(shape => ({
      shape,
      x: shape.x,
      y: shape.y,
      rotation: (shape as any).rotation || 0,
    }));
  }

  execute(): void {
    this.rotate(this.angle);
  }

  undo(): void {
    // 恢复原始状态
    this.originalStates.forEach(({ shape, x, y, rotation }) => {
      shape.x = x;
      shape.y = y;
      if ('rotation' in shape) {
        (shape as any).rotation = rotation;
      }
    });
  }

  private rotate(angle: number): void {
    const radians = angle * (Math.PI / 180);
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);

    this.originalStates.forEach(({ shape, x, y, rotation }) => {
      // 相对于旋转中心的坐标
      const relX = x - this.pivot.x;
      const relY = y - this.pivot.y;

      // 旋转后的坐标
      shape.x = this.pivot.x + relX * cos - relY * sin;
      shape.y = this.pivot.y + relX * sin + relY * cos;

      // 更新图形自身的旋转角度
      if ('rotation' in shape) {
        (shape as any).rotation = rotation + angle;
      }
    });
  }

  getDescription(): string {
    return this.description || this.name;
  }
}

/**
 * 缩放命令
 * 专门用于缩放操作
 */
export class ScaleCommand extends Command {
  readonly name = 'scale';
  readonly description?: string;

  private shapes: Shape[];
  private scaleX: number;
  private scaleY: number;
  private pivot: { x: number; y: number }; // 缩放中心点
  private originalStates: Array<{
    shape: Shape;
    x: number;
    y: number;
    width: number;
    height: number;
  }>;

  constructor(shapes: Shape[], scaleX: number, scaleY: number, pivot: { x: number; y: number }) {
    super();
    this.shapes = shapes;
    this.scaleX = scaleX;
    this.scaleY = scaleY;
    this.pivot = pivot;
    this.description = `Scale ${shapes.length} shape(s) by ${scaleX.toFixed(2)}x, ${scaleY.toFixed(2)}x`;

    // 保存原始状态
    this.originalStates = shapes.map(shape => ({
      shape,
      x: shape.x,
      y: shape.y,
      width: (shape as any).width || 0,
      height: (shape as any).height || 0,
    }));
  }

  execute(): void {
    this.scale(this.scaleX, this.scaleY);
  }

  undo(): void {
    // 恢复原始状态
    this.originalStates.forEach(({ shape, x, y, width, height }) => {
      shape.x = x;
      shape.y = y;
      if ('width' in shape) {
        (shape as any).width = width;
      }
      if ('height' in shape) {
        (shape as any).height = height;
      }
    });
  }

  private scale(scaleX: number, scaleY: number): void {
    this.originalStates.forEach(({ shape, x, y, width, height }) => {
      // 相对于缩放中心的坐标
      const relX = x - this.pivot.x;
      const relY = y - this.pivot.y;

      // 缩放后的坐标
      shape.x = this.pivot.x + relX * scaleX;
      shape.y = this.pivot.y + relY * scaleY;

      // 缩放尺寸
      if ('width' in shape && 'height' in shape) {
        (shape as any).width = width * scaleX;
        (shape as any).height = height * scaleY;
      }
    });
  }

  getDescription(): string {
    return this.description || this.name;
  }
}
