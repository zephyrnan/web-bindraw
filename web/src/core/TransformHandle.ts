/**
 * 变换控制点系统
 *
 * 面试考点：
 * 1. 如何实现图形变换？—— 矩阵复合变换（平移、旋转、缩放）
 * 2. 如何保持中心点不变？—— 先平移到原点，变换，再平移回去
 * 3. 如何实现等比缩放？—— 检测 Shift 键，保持宽高比
 * 4. 性能优化？—— 矩阵预计算、脏矩形标记
 */

import { Vector, Matrix, AABB } from './math';
import type { Shape } from './shapes';

/**
 * 控制点类型
 */
export enum HandleType {
  /** 左上角 */
  TOP_LEFT = 'top-left',
  /** 上中 */
  TOP_CENTER = 'top-center',
  /** 右上角 */
  TOP_RIGHT = 'top-right',
  /** 右中 */
  MIDDLE_RIGHT = 'middle-right',
  /** 右下角 */
  BOTTOM_RIGHT = 'bottom-right',
  /** 下中 */
  BOTTOM_CENTER = 'bottom-center',
  /** 左下角 */
  BOTTOM_LEFT = 'bottom-left',
  /** 左中 */
  MIDDLE_LEFT = 'middle-left',
  /** 旋转控制点 */
  ROTATE = 'rotate',
}

/**
 * 控制点配置
 */
export interface HandleConfig {
  type: HandleType;
  position: Vector;
  cursor: string;
}

/**
 * 变换结果
 */
export interface TransformResult {
  /** 新的位置 */
  x: number;
  y: number;
  /** 新的宽度 */
  width?: number;
  /** 新的高度 */
  height?: number;
  /** 新的旋转角度（度） */
  rotation?: number;
  /** 缩放比例 */
  scaleX?: number;
  scaleY?: number;
}

/**
 * 变换控制点管理器
 */
export class TransformHandle {
  /** 控制点大小 */
  private static readonly HANDLE_SIZE = 8;
  /** 旋转控制点距离 */
  private static readonly ROTATE_HANDLE_DISTANCE = 30;
  /** 最小尺寸 */
  private static readonly MIN_SIZE = 10;

  /** 当前操作的控制点类型 */
  private activeHandle: HandleType | null = null;
  /** 变换起始点 */
  private startPoint: Vector | null = null;
  /** 变换起始时的图形状态 */
  private startBounds: AABB | null = null;
  /** 变换起始时的中心点 */
  private startCenter: Vector | null = null;
  /** 初始宽高比 */
  private aspectRatio: number = 1;

  /**
   * 获取所有控制点配置
   * @param bounds 包围盒
   * @param rotation 旋转角度（弧度），用于调整光标方向
   */
  getHandles(bounds: AABB, rotation: number = 0): HandleConfig[] {
    const handles: HandleConfig[] = [];
    const { minX, minY, maxX, maxY } = bounds;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // 根据旋转角度调整光标方向
    const cursors = this.getRotatedCursors(rotation);

    // 8 个边缘控制点
    handles.push(
      { type: HandleType.TOP_LEFT, position: new Vector(minX, minY), cursor: cursors.nwse },
      { type: HandleType.TOP_CENTER, position: new Vector(centerX, minY), cursor: cursors.ns },
      { type: HandleType.TOP_RIGHT, position: new Vector(maxX, minY), cursor: cursors.nesw },
      { type: HandleType.MIDDLE_RIGHT, position: new Vector(maxX, centerY), cursor: cursors.ew },
      { type: HandleType.BOTTOM_RIGHT, position: new Vector(maxX, maxY), cursor: cursors.nwse },
      { type: HandleType.BOTTOM_CENTER, position: new Vector(centerX, maxY), cursor: cursors.ns },
      { type: HandleType.BOTTOM_LEFT, position: new Vector(minX, maxY), cursor: cursors.nesw },
      { type: HandleType.MIDDLE_LEFT, position: new Vector(minX, centerY), cursor: cursors.ew }
    );

    // 旋转控制点（在上方）
    handles.push({
      type: HandleType.ROTATE,
      position: new Vector(centerX, minY - TransformHandle.ROTATE_HANDLE_DISTANCE),
      cursor: 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'24\' height=\'24\' viewBox=\'0 0 24 24\'><path fill=\'%23000\' d=\'M12 6v3l4-4-4-4v3c-4.42 0-8 3.58-8 8 0 1.57.46 3.03 1.24 4.26L6.7 14.8c-.45-.83-.7-1.79-.7-2.8 0-3.31 2.69-6 6-6zm6.76 1.74L17.3 9.2c.44.84.7 1.79.7 2.8 0 3.31-2.69 6-6 6v-3l-4 4 4 4v-3c4.42 0 8-3.58 8-8 0-1.57-.46-3.03-1.24-4.26z\'/></svg>") 12 12, grab',
    });

    return handles;
  }

  /**
   * 根据旋转角度获取调整后的光标
   */
  private getRotatedCursors(rotation: number): {
    ns: string;
    ew: string;
    nwse: string;
    nesw: string;
  } {
    // 将旋转角度标准化到 0-360 度
    const degrees = ((rotation * 180) / Math.PI) % 360;
    const normalized = ((degrees + 360) % 360);

    // 根据旋转角度选择光标
    // 每45度切换一次光标方向
    const angle = Math.round(normalized / 45) * 45;

    switch (angle) {
      case 0:
      case 360:
        return { ns: 'ns-resize', ew: 'ew-resize', nwse: 'nwse-resize', nesw: 'nesw-resize' };
      case 45:
        return { ns: 'nesw-resize', ew: 'nwse-resize', nwse: 'ew-resize', nesw: 'ns-resize' };
      case 90:
        return { ns: 'ew-resize', ew: 'ns-resize', nwse: 'nesw-resize', nesw: 'nwse-resize' };
      case 135:
        return { ns: 'nwse-resize', ew: 'nesw-resize', nwse: 'ns-resize', nesw: 'ew-resize' };
      case 180:
        return { ns: 'ns-resize', ew: 'ew-resize', nwse: 'nwse-resize', nesw: 'nesw-resize' };
      case 225:
        return { ns: 'nesw-resize', ew: 'nwse-resize', nwse: 'ew-resize', nesw: 'ns-resize' };
      case 270:
        return { ns: 'ew-resize', ew: 'ns-resize', nwse: 'nesw-resize', nesw: 'nwse-resize' };
      case 315:
        return { ns: 'nwse-resize', ew: 'nesw-resize', nwse: 'ns-resize', nesw: 'ew-resize' };
      default:
        return { ns: 'ns-resize', ew: 'ew-resize', nwse: 'nwse-resize', nesw: 'nesw-resize' };
    }
  }

  /**
   * 检测点击的控制点
   */
  hitTest(point: Vector, bounds: AABB, zoom: number, rotation: number = 0): HandleType | null {
    const handles = this.getHandles(bounds, rotation);
    const threshold = TransformHandle.HANDLE_SIZE / zoom;

    for (const handle of handles) {
      const distance = point.distanceTo(handle.position);
      if (distance <= threshold) {
        return handle.type;
      }
    }

    return null;
  }

  /**
   * 开始变换
   */
  startTransform(handleType: HandleType, point: Vector, bounds: AABB): void {
    this.activeHandle = handleType;
    this.startPoint = point;
    this.startBounds = bounds;
    this.startCenter = new Vector(
      (bounds.minX + bounds.maxX) / 2,
      (bounds.minY + bounds.maxY) / 2
    );

    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    this.aspectRatio = width / height;
  }

  /**
   * 执行变换
   */
  transform(currentPoint: Vector, shapes: Shape[], constrainProportions: boolean = false): TransformResult | null {
    if (!this.activeHandle || !this.startPoint || !this.startBounds || !this.startCenter) {
      return null;
    }

    // 旋转变换
    if (this.activeHandle === HandleType.ROTATE) {
      return this.handleRotate(currentPoint, shapes);
    }

    // 缩放变换
    return this.handleScale(currentPoint, shapes, constrainProportions);
  }

  /**
   * 处理旋转
   */
  private handleRotate(currentPoint: Vector, shapes: Shape[]): TransformResult {
    if (!this.startCenter) {
      return { x: 0, y: 0 };
    }

    // 计算旋转角度
    const startAngle = Math.atan2(
      this.startPoint!.y - this.startCenter.y,
      this.startPoint!.x - this.startCenter.x
    );
    const currentAngle = Math.atan2(
      currentPoint.y - this.startCenter.y,
      currentPoint.x - this.startCenter.x
    );

    let deltaAngle = (currentAngle - startAngle) * (180 / Math.PI);

    // 15度吸附（当不按Shift时）
    const snapAngle = 15;
    deltaAngle = Math.round(deltaAngle / snapAngle) * snapAngle;

    return {
      x: this.startCenter.x,
      y: this.startCenter.y,
      rotation: deltaAngle,
    };
  }

  /**
   * 处理缩放
   */
  private handleScale(currentPoint: Vector, shapes: Shape[], constrainProportions: boolean): TransformResult {
    if (!this.startBounds || !this.startCenter) {
      return { x: 0, y: 0 };
    }

    const bounds = this.startBounds;
    let newMinX = bounds.minX;
    let newMinY = bounds.minY;
    let newMaxX = bounds.maxX;
    let newMaxY = bounds.maxY;

    const dx = currentPoint.x - this.startPoint!.x;
    const dy = currentPoint.y - this.startPoint!.y;

    // 根据控制点类型调整边界
    switch (this.activeHandle) {
      case HandleType.TOP_LEFT:
        newMinX += dx;
        newMinY += dy;
        if (constrainProportions) {
          const avgDelta = (dx + dy) / 2;
          newMinX = bounds.minX + avgDelta;
          newMinY = bounds.minY + avgDelta;
        }
        break;
      case HandleType.TOP_CENTER:
        newMinY += dy;
        break;
      case HandleType.TOP_RIGHT:
        newMaxX += dx;
        newMinY += dy;
        if (constrainProportions) {
          const avgDelta = (dx - dy) / 2;
          newMaxX = bounds.maxX + avgDelta;
          newMinY = bounds.minY - avgDelta;
        }
        break;
      case HandleType.MIDDLE_RIGHT:
        newMaxX += dx;
        break;
      case HandleType.BOTTOM_RIGHT:
        newMaxX += dx;
        newMaxY += dy;
        if (constrainProportions) {
          const avgDelta = (dx + dy) / 2;
          newMaxX = bounds.maxX + avgDelta;
          newMaxY = bounds.maxY + avgDelta;
        }
        break;
      case HandleType.BOTTOM_CENTER:
        newMaxY += dy;
        break;
      case HandleType.BOTTOM_LEFT:
        newMinX += dx;
        newMaxY += dy;
        if (constrainProportions) {
          const avgDelta = (-dx + dy) / 2;
          newMinX = bounds.minX - avgDelta;
          newMaxY = bounds.maxY + avgDelta;
        }
        break;
      case HandleType.MIDDLE_LEFT:
        newMinX += dx;
        break;
    }

    // 确保最小尺寸
    if (newMaxX - newMinX < TransformHandle.MIN_SIZE) {
      if (this.activeHandle?.includes('left')) {
        newMinX = newMaxX - TransformHandle.MIN_SIZE;
      } else {
        newMaxX = newMinX + TransformHandle.MIN_SIZE;
      }
    }
    if (newMaxY - newMinY < TransformHandle.MIN_SIZE) {
      if (this.activeHandle?.includes('top')) {
        newMinY = newMaxY - TransformHandle.MIN_SIZE;
      } else {
        newMaxY = newMinY + TransformHandle.MIN_SIZE;
      }
    }

    const newWidth = newMaxX - newMinX;
    const newHeight = newMaxY - newMinY;
    const scaleX = newWidth / (bounds.maxX - bounds.minX);
    const scaleY = newHeight / (bounds.maxY - bounds.minY);

    return {
      x: newMinX,
      y: newMinY,
      width: newWidth,
      height: newHeight,
      scaleX,
      scaleY,
    };
  }

  /**
   * 结束变换
   */
  endTransform(): void {
    this.activeHandle = null;
    this.startPoint = null;
    this.startBounds = null;
    this.startCenter = null;
  }

  /**
   * 获取当前激活的控制点
   */
  getActiveHandle(): HandleType | null {
    return this.activeHandle;
  }

  /**
   * 渲染控制点
   */
  render(ctx: CanvasRenderingContext2D, bounds: AABB, zoom: number, rotation: number = 0): void {
    const handles = this.getHandles(bounds, rotation);
    const handleSize = TransformHandle.HANDLE_SIZE / zoom;

    ctx.save();

    handles.forEach(handle => {
      const { position, type } = handle;

      // 绘制控制点
      if (type === HandleType.ROTATE) {
        // 旋转控制点 - 圆形
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / zoom;
        ctx.beginPath();
        ctx.arc(position.x, position.y, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 连接线
        ctx.beginPath();
        ctx.moveTo((bounds.minX + bounds.maxX) / 2, bounds.minY);
        ctx.lineTo(position.x, position.y);
        ctx.stroke();
      } else {
        // 缩放控制点 - 方形
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / zoom;
        ctx.fillRect(
          position.x - handleSize / 2,
          position.y - handleSize / 2,
          handleSize,
          handleSize
        );
        ctx.strokeRect(
          position.x - handleSize / 2,
          position.y - handleSize / 2,
          handleSize,
          handleSize
        );
      }
    });

    ctx.restore();
  }

  /**
   * 获取控制点的光标样式
   */
  getCursor(handleType: HandleType | null, rotation: number = 0): string {
    if (!handleType) return 'default';

    const handles = this.getHandles(new AABB(0, 0, 100, 100), rotation);
    const handle = handles.find(h => h.type === handleType);
    return handle?.cursor || 'default';
  }
}
