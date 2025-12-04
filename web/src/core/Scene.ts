/**
 * 场景管理器
 * 类似 DOM 树，管理所有图形对象
 *
 * 面试考点：
 * 1. 为什么需要 Scene？—— 统一管理图形，提供查询、遍历能力
 * 2. 如何优化渲染？—— 脏矩形、层级缓存、空间索引（四叉树）
 * 3. 如何处理层级？—— z-index 排序
 * 4. 性能优化？—— 四叉树将 O(n) 查询优化到 O(log n)
 */

import type { Shape } from './shapes';
import { AABB, Vector } from './math';
import { QuadTree } from './QuadTree';

export interface SceneOptions {
  /** 是否自动排序（根据 z-index） */
  autoSort?: boolean;
  /** 是否启用四叉树优化（大量图形时推荐） */
  useQuadTree?: boolean;
  /** 四叉树边界 */
  quadTreeBounds?: AABB;
}

export class Scene {
  /** 所有图形 */
  private shapes: Shape[] = [];

  /** 是否自动排序 */
  private autoSort: boolean;

  /** 四叉树（用于空间查询优化） */
  private quadTree: QuadTree | null = null;

  /** 是否使用四叉树 */
  private useQuadTree: boolean;

  /** 四叉树是否需要重建 */
  private quadTreeDirty = true;

  /** 变化回调 */
  private changeCallbacks: Array<() => void> = [];

  constructor(options: SceneOptions = {}) {
    this.autoSort = options.autoSort ?? true;
    this.useQuadTree = options.useQuadTree ?? false;

    // 初始化四叉树
    if (this.useQuadTree) {
      const bounds = options.quadTreeBounds || new AABB(-10000, -10000, 10000, 10000);
      this.quadTree = new QuadTree(bounds);
    }
  }

  /**
   * 添加图形
   */
  add(shape: Shape): void {
    this.shapes.push(shape);
    if (this.autoSort) {
      this.sort();
    }
    this.quadTreeDirty = true;
    this.notifyChange();
  }

  /**
   * 添加多个图形
   */
  addMany(shapes: Shape[]): void {
    this.shapes.push(...shapes);
    if (this.autoSort) {
      this.sort();
    }
    this.notifyChange();
  }

  /**
   * 移除图形
   */
  remove(shape: Shape): boolean {
    const index = this.shapes.indexOf(shape);
    if (index > -1) {
      this.shapes.splice(index, 1);
      this.quadTreeDirty = true;
      this.notifyChange();
      return true;
    }
    return false;
  }

  /**
   * 移除多个图形
   */
  removeMany(shapes: Shape[]): void {
    shapes.forEach(shape => {
      const index = this.shapes.indexOf(shape);
      if (index > -1) {
        this.shapes.splice(index, 1);
      }
    });
    this.notifyChange();
  }

  /**
   * 清空所有图形
   */
  clear(): void {
    this.shapes = [];
    this.notifyChange();
  }

  /**
   * 获取所有图形
   */
  getShapes(): Shape[] {
    return this.shapes;
  }

  /**
   * 获取图形数量
   */
  count(): number {
    return this.shapes.length;
  }

  /**
   * 根据 ID 查找图形
   */
  findById(id: string): Shape | undefined {
    return this.shapes.find(shape => shape.id === id);
  }

  /**
   * 根据名称查找图形
   */
  findByName(name: string): Shape[] {
    return this.shapes.filter(shape => shape.name === name);
  }

  /**
   * 命中测试：查找指定点下的图形
   * 从上层（后面）往下层（前面）查找
   * 面试考点：四叉树优化 - 从 O(n) 降到 O(log n)
   */
  hitTest(point: Vector): Shape | null {
    // 使用四叉树优化
    if (this.useQuadTree && this.quadTree) {
      this.rebuildQuadTreeIfNeeded();
      const candidates = this.quadTree.queryPoint(point);

      // 从候选图形中找到最上层的
      for (let i = candidates.length - 1; i >= 0; i--) {
        const shape = candidates[i];
        if (shape.visible && !shape.locked && shape.hitTest(point)) {
          return shape;
        }
      }
      return null;
    }

    // 常规遍历
    for (let i = this.shapes.length - 1; i >= 0; i--) {
      const shape = this.shapes[i];
      if (shape.visible && !shape.locked && shape.hitTest(point)) {
        return shape;
      }
    }
    return null;
  }

  /**
   * 查找包围盒内的所有图形
   * 面试考点：四叉树范围查询优化
   */
  findInBounds(bounds: AABB): Shape[] {
    // 使用四叉树优化
    if (this.useQuadTree && this.quadTree) {
      this.rebuildQuadTreeIfNeeded();
      return this.quadTree.query(bounds).filter(shape => shape.visible);
    }

    // 常规遍历
    return this.shapes.filter(shape => {
      if (!shape.visible) return false;
      const shapeBounds = shape.getBoundingBox();
      return bounds.intersects(shapeBounds);
    });
  }

  /**
   * 根据 z-index 排序
   */
  sort(): void {
    this.shapes.sort((a, b) => a.zIndex - b.zIndex);
  }

  /**
   * 将图形移动到最前面
   */
  bringToFront(shape: Shape): void {
    const maxZIndex = Math.max(...this.shapes.map(s => s.zIndex), 0);
    shape.zIndex = maxZIndex + 1;
    if (this.autoSort) {
      this.sort();
    }
    this.notifyChange();
  }

  /**
   * 将图形移动到最后面
   */
  sendToBack(shape: Shape): void {
    const minZIndex = Math.min(...this.shapes.map(s => s.zIndex), 0);
    shape.zIndex = minZIndex - 1;
    if (this.autoSort) {
      this.sort();
    }
    this.notifyChange();
  }

  /**
   * 向前移动一层
   */
  bringForward(shape: Shape): void {
    const index = this.shapes.indexOf(shape);
    if (index < this.shapes.length - 1) {
      const nextShape = this.shapes[index + 1];
      const temp = shape.zIndex;
      shape.zIndex = nextShape.zIndex;
      nextShape.zIndex = temp;
      if (this.autoSort) {
        this.sort();
      }
      this.notifyChange();
    }
  }

  /**
   * 向后移动一层
   */
  sendBackward(shape: Shape): void {
    const index = this.shapes.indexOf(shape);
    if (index > 0) {
      const prevShape = this.shapes[index - 1];
      const temp = shape.zIndex;
      shape.zIndex = prevShape.zIndex;
      prevShape.zIndex = temp;
      if (this.autoSort) {
        this.sort();
      }
      this.notifyChange();
    }
  }

  /**
   * 获取场景的总包围盒
   */
  getBounds(): AABB | null {
    if (this.shapes.length === 0) return null;

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    this.shapes.forEach(shape => {
      if (shape.visible) {
        const bounds = shape.getBoundingBox();
        minX = Math.min(minX, bounds.minX);
        minY = Math.min(minY, bounds.minY);
        maxX = Math.max(maxX, bounds.maxX);
        maxY = Math.max(maxY, bounds.maxY);
      }
    });

    if (!isFinite(minX)) return null;

    return new AABB(minX, minY, maxX, maxY);
  }

  /**
   * 遍历所有可见的图形
   */
  forEachVisible(callback: (shape: Shape, index: number) => void): void {
    this.shapes.forEach((shape, index) => {
      if (shape.visible) {
        callback(shape, index);
      }
    });
  }

  /**
   * 过滤图形
   */
  filter(predicate: (shape: Shape) => boolean): Shape[] {
    return this.shapes.filter(predicate);
  }

  /**
   * 监听变化
   */
  onChange(callback: () => void): void {
    this.changeCallbacks.push(callback);
  }

  /**
   * 取消监听
   */
  offChange(callback: () => void): void {
    const index = this.changeCallbacks.indexOf(callback);
    if (index > -1) {
      this.changeCallbacks.splice(index, 1);
    }
  }

  /**
   * 通知变化
   */
  private notifyChange(): void {
    this.changeCallbacks.forEach(cb => cb());
  }

  /**
   * 重建四叉树（如果需要）
   */
  private rebuildQuadTreeIfNeeded(): void {
    if (!this.quadTreeDirty || !this.quadTree) return;

    this.quadTree.rebuild(this.shapes);
    this.quadTreeDirty = false;
  }

  /**
   * 启用/禁用四叉树
   */
  setUseQuadTree(enabled: boolean, bounds?: AABB): void {
    this.useQuadTree = enabled;

    if (enabled && !this.quadTree) {
      const treeBounds = bounds || new AABB(-10000, -10000, 10000, 10000);
      this.quadTree = new QuadTree(treeBounds);
      this.quadTreeDirty = true;
    }
  }

  /**
   * 获取四叉树统计信息（调试用）
   */
  getQuadTreeStats(): { nodeCount: number; shapeCount: number; maxDepth: number } | null {
    if (!this.quadTree) return null;
    this.rebuildQuadTreeIfNeeded();
    return this.quadTree.getStats();
  }

  /**
   * 渲染四叉树（调试用）
   */
  renderQuadTreeDebug(ctx: CanvasRenderingContext2D): void {
    if (!this.quadTree) return;
    this.rebuildQuadTreeIfNeeded();
    this.quadTree.renderDebug(ctx);
  }

  /**
   * 序列化为 JSON
   */
  toJSON(): any {
    return {
      shapes: this.shapes.map(shape => shape.toJSON())
    };
  }

  /**
   * 从 JSON 反序列化
   */
  static fromJSON(json: unknown, shapeFactory?: (json: unknown) => Shape): Scene {
    if (!json || typeof json !== 'object' || !('shapes' in json)) {
      throw new Error('Invalid Scene JSON data');
    }
    
    const scene = new Scene();
    const data = json as { shapes: unknown[] };
    
    if (shapeFactory && data.shapes) {
      for (const shapeJson of data.shapes) {
        try {
          const shape = shapeFactory(shapeJson);
          scene.add(shape);
        } catch (error) {
          console.warn('Failed to create shape from JSON:', error);
        }
      }
    }
    
    return scene;
  }
}
