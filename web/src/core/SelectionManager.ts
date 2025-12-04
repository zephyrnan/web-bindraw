/**
 * 选择管理器
 * 管理图形的选择状态
 *
 * 面试考点：
 * 1. 如何高效管理选择状态？—— 使用 Set 数据结构，O(1) 查询
 * 2. 如何计算多图形的联合包围盒？—— 遍历所有图形，取最小最大值
 * 3. 如何支持变换操作？—— 统一的变换接口，批量操作
 */
import type { Shape } from './shapes';
import { AABB } from './math';

export class SelectionManager {
  private selectedShapes: Set<Shape> = new Set();

  /** 选择变化回调 */
  private onChangeCallback?: (shapes: Shape[]) => void;

  /**
   * 设置选择
   */
  setSelection(shapes: Shape[]): void {
    this.selectedShapes.clear();
    shapes.forEach(shape => this.selectedShapes.add(shape));
    this.notifyChange();
  }

  /**
   * 添加到选择
   */
  addToSelection(shapes: Shape[]): void {
    shapes.forEach(shape => this.selectedShapes.add(shape));
    this.notifyChange();
  }

  /**
   * 从选择中移除
   */
  removeFromSelection(shapes: Shape[]): void {
    shapes.forEach(shape => this.selectedShapes.delete(shape));
    this.notifyChange();
  }

  /**
   * 切换选择
   */
  toggleSelection(shape: Shape): void {
    if (this.selectedShapes.has(shape)) {
      this.selectedShapes.delete(shape);
    } else {
      this.selectedShapes.add(shape);
    }
    this.notifyChange();
  }

  /**
   * 清空选择
   */
  clear(): void {
    this.selectedShapes.clear();
    this.notifyChange();
  }

  /**
   * 获取选中的图形
   */
  getSelection(): Shape[] {
    return Array.from(this.selectedShapes);
  }

  /**
   * 是否选中
   */
  isSelected(shape: Shape): boolean {
    return this.selectedShapes.has(shape);
  }

  /**
   * 获取选中数量
   */
  count(): number {
    return this.selectedShapes.size;
  }

  /**
   * 监听选择变化
   */
  onChange(callback: (shapes: Shape[]) => void): void {
    this.onChangeCallback = callback;
  }

  private notifyChange(): void {
    this.onChangeCallback?.(this.getSelection());
  }

  /**
   * 获取选中图形的联合包围盒
   * 面试考点：如何计算多个矩形的联合包围盒？
   */
  getSelectionBounds(): AABB | null {
    if (this.selectedShapes.size === 0) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    this.selectedShapes.forEach(shape => {
      const bounds = shape.getBoundingBox();
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    return new AABB(minX, minY, maxX, maxY);
  }

  /**
   * 应用变换到所有选中的图形
   */
  applyTransform(transform: {
    deltaX?: number;
    deltaY?: number;
    scaleX?: number;
    scaleY?: number;
    rotation?: number;
    pivot?: { x: number; y: number };
  }): void {
    const { deltaX = 0, deltaY = 0, scaleX = 1, scaleY = 1, rotation = 0, pivot } = transform;

    this.selectedShapes.forEach(shape => {
      // 平移
      if (deltaX !== 0 || deltaY !== 0) {
        shape.x += deltaX;
        shape.y += deltaY;
      }

      // 缩放（相对于选择中心）
      if (pivot && (scaleX !== 1 || scaleY !== 1)) {
        // 相对于 pivot 点缩放
        const relX = shape.x - pivot.x;
        const relY = shape.y - pivot.y;
        shape.x = pivot.x + relX * scaleX;
        shape.y = pivot.y + relY * scaleY;

        // 缩放图形尺寸
        if ('width' in shape && 'height' in shape) {
          (shape as any).width *= scaleX;
          (shape as any).height *= scaleY;
        }
      }

      // 旋转
      if (rotation !== 0 && pivot) {
        const relX = shape.x - pivot.x;
        const relY = shape.y - pivot.y;
        const angle = rotation * (Math.PI / 180);
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        shape.x = pivot.x + relX * cos - relY * sin;
        shape.y = pivot.y + relX * sin + relY * cos;

        // 更新图形自身的旋转
        if ('rotation' in shape) {
          (shape as any).rotation = ((shape as any).rotation || 0) + rotation;
        }
      }
    });

    this.notifyChange();
  }
}
