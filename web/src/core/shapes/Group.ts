/**
 * 组合图形（容器）
 * 可以包含多个子图形，作为一个整体进行操作
 *
 * 面试考点：组合模式（Composite Pattern）
 */

import { Shape, type ShapeStyle } from './Shape';
import { Vector, AABB } from '../math';

export interface GroupOptions {
  id?: string;
  name?: string;
  x?: number;
  y?: number;
  children?: Shape[];
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  style?: ShapeStyle;
}

export class Group extends Shape {
  children: Shape[] = [];

  constructor(options: GroupOptions = {}) {
    super(options);
    this.name = options.name || 'Group';

    if (options.children) {
      for (const child of options.children) {
        this.add(child);
      }
    }
  }

  /**
   * 添加子图形
   */
  add(shape: Shape): void {
    shape.parent = this;
    this.children.push(shape);
  }

  /**
   * 移除子图形
   */
  remove(shape: Shape): void {
    const index = this.children.indexOf(shape);
    if (index !== -1) {
      shape.parent = null;
      this.children.splice(index, 1);
    }
  }

  /**
   * 通过ID查找子图形
   */
  findById(id: string): Shape | null {
    for (const child of this.children) {
      if (child.id === id) return child;
      if (child instanceof Group) {
        const found = child.findById(id);
        if (found) return found;
      }
    }
    return null;
  }

  /**
   * 清空所有子图形
   */
  clear(): void {
    for (const child of this.children) {
      child.parent = null;
    }
    this.children = [];
  }

  /**
   * 绘制所有子图形
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // 按 zIndex 排序
    const sorted = [...this.children].sort((a, b) => a.zIndex - b.zIndex);

    for (const child of sorted) {
      child.render(ctx);
    }
  }

  /**
   * 碰撞检测：检测是否击中任何子图形
   */
  hitTest(worldPoint: Vector): boolean {
    // 将世界坐标转换为本地坐标
    const localPoint = this.worldToLocal(worldPoint);

    // 从后向前检测（后绘制的在上面）
    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (child.visible && !child.locked) {
        // 将 Group 的本地坐标转换为子元素的世界坐标
        const childWorldPoint = child.parent ? localPoint : worldPoint;
        if (child.hitTest(childWorldPoint)) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * 获取击中的具体图形
   */
  hitTestShape(worldPoint: Vector): Shape | null {
    // 将世界坐标转换为本地坐标
    const localPoint = this.worldToLocal(worldPoint);

    for (let i = this.children.length - 1; i >= 0; i--) {
      const child = this.children[i];
      if (!child.visible || child.locked) continue;

      // 将 Group 的本地坐标传递给子元素
      const childWorldPoint = child.parent ? localPoint : worldPoint;

      if (child instanceof Group) {
        const hit = child.hitTestShape(childWorldPoint);
        if (hit) return hit;
      } else if (child.hitTest(childWorldPoint)) {
        return child;
      }
    }
    return null;
  }

  /**
   * 获取包围盒（包含所有子图形）
   */
  getBoundingBox(): AABB {
    if (this.children.length === 0) {
      return new AABB(0, 0, 0, 0);
    }

    let result: AABB | null = null;

    for (const child of this.children) {
      const childBBox = child.getBoundingBox();

      // 将子图形的包围盒转换到当前坐标系
      const childMatrix = child.getLocalMatrix();
      const corners = childBBox.getCorners().map(c => childMatrix.transformPoint(c));
      const transformedBBox = AABB.fromPoints(corners);

      if (result) {
        result = result.merge(transformedBBox);
      } else {
        result = transformedBBox;
      }
    }

    return result || new AABB(0, 0, 0, 0);
  }

  /**
   * 获取所有子图形（扁平化）
   */
  getAllShapes(): Shape[] {
    const result: Shape[] = [];

    for (const child of this.children) {
      if (child instanceof Group) {
        result.push(...child.getAllShapes());
      } else {
        result.push(child);
      }
    }

    return result;
  }

  /**
   * 获取子图形数量
   */
  get count(): number {
    return this.children.length;
  }

  clone(): Group {
    const group = new Group({
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: { ...this.style }
    });

    for (const child of this.children) {
      group.add(child.clone());
    }

    return group;
  }

  toJSON(): any {
    return {
      type: 'Group',
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: this.style,
      children: this.children.map(c => c.toJSON()),
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex
    };
  }

  static fromJSON(json: unknown, shapeFactory: (json: unknown) => Shape): Group {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid Group JSON data');
    }
    
    const data = json as Record<string, unknown>;
    
    const options: GroupOptions = {
      id: typeof data.id === 'string' ? data.id : undefined,
      name: typeof data.name === 'string' ? data.name : undefined,
      x: typeof data.x === 'number' ? data.x : 0,
      y: typeof data.y === 'number' ? data.y : 0,
      rotation: typeof data.rotation === 'number' ? data.rotation : 0,
      scaleX: typeof data.scaleX === 'number' ? data.scaleX : 1,
      scaleY: typeof data.scaleY === 'number' ? data.scaleY : 1,
      style: data.style && typeof data.style === 'object' ? data.style as ShapeStyle : undefined,
      children: []
    };
    
    const group = new Group(options);

    if (Array.isArray(data.children)) {
      for (const childJson of data.children) {
        try {
          const child = shapeFactory(childJson);
          group.add(child);
        } catch (error) {
          console.warn('Failed to create child shape:', error);
        }
      }
    }

    return group;
  }
}
