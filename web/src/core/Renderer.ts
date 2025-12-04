/**
 * 渲染器
 * 负责将图形绘制到Canvas
 *
 * 面试考点：
 * 1. 如何优化Canvas渲染？—— 离屏渲染、脏矩形、层级缓存
 * 2. 高DPI屏幕适配？—— devicePixelRatio缩放
 * 3. 视口变换？—— 通过矩阵变换实现平移和缩放
 */
import type { Shape } from './shapes';
import { Matrix } from './math';

export interface RendererOptions {
  /** Canvas元素 */
  canvas: HTMLCanvasElement;
  /** 是否启用高DPI支持 */
  enableHiDPI?: boolean;
  /** 背景色 */
  backgroundColor?: string;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private devicePixelRatio: number;

  /** 视口变换矩阵（平移+缩放） */
  private viewMatrix: Matrix = Matrix.identity();

  /** 背景色 */
  private backgroundColor: string;

  constructor(options: RendererOptions) {
    this.canvas = options.canvas;
    this.backgroundColor = options.backgroundColor ?? '#ffffff';

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    // 高DPI支持
    this.devicePixelRatio = options.enableHiDPI ? window.devicePixelRatio || 1 : 1;
    this.updateCanvasSize();
  }

  /**
   * 更新Canvas尺寸（响应式）
   */
  updateCanvasSize(): void {
    const rect = this.canvas.getBoundingClientRect();

    // 设置画布的实际像素大小
    this.canvas.width = rect.width * this.devicePixelRatio;
    this.canvas.height = rect.height * this.devicePixelRatio;

    // 设置画布的CSS显示大小
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    // 缩放上下文以匹配设备像素比
    this.ctx.scale(this.devicePixelRatio, this.devicePixelRatio);
  }

  /**
   * 设置视口变换
   * @param pan 平移量
   * @param zoom 缩放比例
   */
  setView(pan: { x: number; y: number }, zoom: number): void {
    this.viewMatrix = Matrix.identity()
      .translate(pan.x, pan.y)
      .scale(zoom, zoom);
  }

  /**
   * 清空画布
   */
  clear(): void {
    const width = this.canvas.width / this.devicePixelRatio;
    const height = this.canvas.height / this.devicePixelRatio;

    this.ctx.fillStyle = this.backgroundColor;
    this.ctx.fillRect(0, 0, width, height);
  }

  /**
   * 渲染图形列表
   */
  render(shapes: Shape[]): void {
    this.clear();

    this.ctx.save();

    // 应用视口变换
    this.applyMatrix(this.viewMatrix);

    // 绘制所有图形
    shapes.forEach(shape => {
      if (shape.visible) {
        shape.draw(this.ctx);
      }
    });

    this.ctx.restore();
  }

  /**
   * 渲染单个图形（用于预览）
   */
  renderShape(shape: Shape): void {
    this.ctx.save();
    this.applyMatrix(this.viewMatrix);
    shape.draw(this.ctx);
    this.ctx.restore();
  }

  /**
   * 绘制选择框
   */
  drawSelectionBox(x: number, y: number, width: number, height: number): void {
    this.ctx.save();
    this.applyMatrix(this.viewMatrix);

    this.ctx.strokeStyle = '#3b82f6';
    this.ctx.lineWidth = 1;
    this.ctx.setLineDash([5, 5]);
    this.ctx.strokeRect(x, y, width, height);

    this.ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
    this.ctx.fillRect(x, y, width, height);

    this.ctx.restore();
  }

  /**
   * 绘制选中图形的控制框
   */
  drawSelectionHandles(shapes: Shape[]): void {
    this.ctx.save();
    this.applyMatrix(this.viewMatrix);

    shapes.forEach(shape => {
      const bounds = shape.getBoundingBox();

      // 绘制边框
      this.ctx.strokeStyle = '#3b82f6';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([]);
      this.ctx.strokeRect(
        bounds.minX,
        bounds.minY,
        bounds.maxX - bounds.minX,
        bounds.maxY - bounds.minY
      );

      // 绘制8个控制点
      const handleSize = 8;
      const handles = [
        { x: bounds.minX, y: bounds.minY }, // 左上
        { x: (bounds.minX + bounds.maxX) / 2, y: bounds.minY }, // 上中
        { x: bounds.maxX, y: bounds.minY }, // 右上
        { x: bounds.maxX, y: (bounds.minY + bounds.maxY) / 2 }, // 右中
        { x: bounds.maxX, y: bounds.maxY }, // 右下
        { x: (bounds.minX + bounds.maxX) / 2, y: bounds.maxY }, // 下中
        { x: bounds.minX, y: bounds.maxY }, // 左下
        { x: bounds.minX, y: (bounds.minY + bounds.maxY) / 2 }, // 左中
      ];

      handles.forEach(handle => {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(
          handle.x - handleSize / 2,
          handle.y - handleSize / 2,
          handleSize,
          handleSize
        );
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.strokeRect(
          handle.x - handleSize / 2,
          handle.y - handleSize / 2,
          handleSize,
          handleSize
        );
      });
    });

    this.ctx.restore();
  }

  /**
   * 应用变换矩阵
   */
  private applyMatrix(matrix: Matrix): void {
    this.ctx.setTransform(
      matrix.a,
      matrix.b,
      matrix.c,
      matrix.d,
      matrix.e,
      matrix.f
    );
  }

  /**
   * 获取渲染上下文
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * 获取Canvas元素
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
