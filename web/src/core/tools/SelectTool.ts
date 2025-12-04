/**
 * 选择工具
 * 用于选择、移动、缩放、旋转图形
 *
 * 面试考点：
 * 1. 如何实现拖拽？—— 记录起始点，计算偏移量
 * 2. 如何实现多选？—— 按住Shift键累加选择
 * 3. 如何实现框选？—— 绘制选择框，检测相交图形
 * 4. 如何实现变换控制点？—— TransformHandle 管理控制点逻辑
 * 5. 如何保证变换流畅？—— 实时预览 + 命令系统（撤销重做）
 */
import { Tool, type ToolEvent } from './Tool';
import { MoveShapeCommand } from '../commands';
import { TransformHandle, HandleType } from '../TransformHandle';
import type { Editor } from '../Editor';
import type { Shape } from '../shapes';
import type { Vector } from '../math';
import { AABB } from '../math';

export enum SelectMode {
  /** 空闲状态 */
  IDLE = 'idle',
  /** 拖拽移动 */
  DRAGGING = 'dragging',
  /** 框选 */
  BOX_SELECT = 'box-select',
  /** 变换（缩放/旋转） */
  TRANSFORMING = 'transforming',
}

export class SelectTool extends Tool {
  readonly name = 'select';
  readonly icon = 'cursor';
  readonly shortcut = 'V';

  private editor: Editor;
  private mode: SelectMode = SelectMode.IDLE;
  private startPoint: Vector | null = null;
  private selectedShapes: Shape[] = [];
  private boxSelectStart: Vector | null = null;
  private boxSelectEnd: Vector | null = null;
  private totalDragDelta = { dx: 0, dy: 0 }; // 记录拖拽总偏移量

  /** 变换控制点管理器 */
  private transformHandle: TransformHandle;
  /** 悬停的控制点 */
  private hoveredHandle: HandleType | null = null;
  /** 变换前的图形状态（用于撤销） */
  private transformStartState: Map<Shape, { x: number; y: number; width?: number; height?: number; rotation?: number }> = new Map();

  constructor(editor: Editor) {
    super();
    this.editor = editor;
    this.transformHandle = new TransformHandle();
  }

  onPointerDown(event: ToolEvent): void {
    const selectionBounds = this.getSelectionBounds();

    // 检测是否点击了变换控制点
    if (selectionBounds && this.selectedShapes.length > 0) {
      const rotation = this.getSelectionRotation();
      const handleType = this.transformHandle.hitTest(event.point, selectionBounds, this.editor.getZoom(), rotation);
      if (handleType) {
        this.mode = SelectMode.TRANSFORMING;
        this.transformHandle.startTransform(handleType, event.point, selectionBounds);
        this.saveTransformStartState();
        return;
      }
    }

    const hitShape = this.editor.scene.hitTest(event.point);

    if (hitShape) {
      // 点击到图形
      if (event.shiftKey) {
        // Shift键多选
        this.toggleSelection(hitShape);
      } else if (!this.selectedShapes.includes(hitShape)) {
        // 单选
        this.setSelection([hitShape]);
      }

      this.mode = SelectMode.DRAGGING;
      this.startPoint = event.point;
      this.totalDragDelta = { dx: 0, dy: 0 }; // 重置拖拽偏移量
    } else {
      // 点击空白处
      if (!event.shiftKey) {
        this.clearSelection();
      }

      this.mode = SelectMode.BOX_SELECT;
      this.boxSelectStart = event.point;
      this.boxSelectEnd = event.point;
    }
  }

  onPointerMove(event: ToolEvent): void {
    // 更新悬停的控制点（用于光标样式）
    const selectionBounds = this.getSelectionBounds();
    if (selectionBounds && this.mode === SelectMode.IDLE) {
      const rotation = this.getSelectionRotation();
      this.hoveredHandle = this.transformHandle.hitTest(event.point, selectionBounds, this.editor.getZoom(), rotation);
      this.editor.renderer.requestRender();
    }

    switch (this.mode) {
      case SelectMode.DRAGGING:
        this.handleDrag(event);
        break;
      case SelectMode.BOX_SELECT:
        this.handleBoxSelect(event);
        break;
      case SelectMode.TRANSFORMING:
        this.handleTransform(event);
        break;
    }
  }

  onPointerUp(event: ToolEvent): void {
    if (this.mode === SelectMode.BOX_SELECT) {
      // 完成框选
      this.boxSelectStart = null;
      this.boxSelectEnd = null;
    } else if (this.mode === SelectMode.DRAGGING) {
      // 完成拖拽，如果有偏移则创建命令
      if (
        this.selectedShapes.length > 0 &&
        (Math.abs(this.totalDragDelta.dx) > 0.01 ||
          Math.abs(this.totalDragDelta.dy) > 0.01)
      ) {
        const command = new MoveShapeCommand(
          this.selectedShapes,
          this.totalDragDelta.dx,
          this.totalDragDelta.dy
        );
        // 注意：图形已经在拖拽过程中移动了，所以需要先撤销移动
        this.selectedShapes.forEach(shape => {
          shape.x -= this.totalDragDelta.dx;
          shape.y -= this.totalDragDelta.dy;
        });
        // 然后通过命令系统执行移动
        this.editor.commandManager.execute(command);
      }
    } else if (this.mode === SelectMode.TRANSFORMING) {
      // 完成变换
      this.transformHandle.endTransform();
      // TODO: 创建变换命令以支持撤销重做
    }

    this.mode = SelectMode.IDLE;
    this.startPoint = null;
    this.editor.renderer.requestRender();
  }

  private handleDrag(event: ToolEvent): void {
    if (!this.startPoint) return;

    const dx = event.point.x - this.startPoint.x;
    const dy = event.point.y - this.startPoint.y;

    // 移动选中的图形（实时预览）
    this.selectedShapes.forEach(shape => {
      shape.x += dx;
      shape.y += dy;
    });

    // 累加总偏移量
    this.totalDragDelta.dx += dx;
    this.totalDragDelta.dy += dy;

    this.startPoint = event.point;
    this.editor.renderer.requestRender();
  }

  private handleBoxSelect(event: ToolEvent): void {
    if (!this.boxSelectStart) return;

    this.boxSelectEnd = event.point;

    // 计算选择框
    const x1 = Math.min(this.boxSelectStart.x, event.point.x);
    const y1 = Math.min(this.boxSelectStart.y, event.point.y);
    const x2 = Math.max(this.boxSelectStart.x, event.point.x);
    const y2 = Math.max(this.boxSelectStart.y, event.point.y);

    const selectBounds = new AABB(x1, y1, x2, y2);

    // 检测相交的图形
    const selected = this.editor.scene.findInBounds(selectBounds);
    this.setSelection(selected);

    this.editor.renderer.requestRender();
  }

  private handleTransform(event: ToolEvent): void {
    if (!this.transformHandle.getActiveHandle()) return;

    // 执行变换（Shift 键约束等比例）
    const result = this.transformHandle.transform(event.point, this.selectedShapes, event.shiftKey);

    if (result) {
      const selectionBounds = this.getSelectionBounds();
      if (!selectionBounds) return;

      const centerX = (selectionBounds.minX + selectionBounds.maxX) / 2;
      const centerY = (selectionBounds.minY + selectionBounds.maxY) / 2;

      // 应用变换到所有选中的图形
      if (result.rotation !== undefined) {
        // 旋转变换
        this.selectedShapes.forEach(shape => {
          const state = this.transformStartState.get(shape);
          if (!state) return;

          // 恢复初始状态
          shape.x = state.x;
          shape.y = state.y;

          // 应用旋转
          const angle = result.rotation! * (Math.PI / 180);
          const relX = shape.x - centerX;
          const relY = shape.y - centerY;
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);

          shape.x = centerX + relX * cos - relY * sin;
          shape.y = centerY + relX * sin + relY * cos;

          if ('rotation' in shape) {
            (shape as any).rotation = (state.rotation || 0) + result.rotation!;
          }
        });
      } else if (result.scaleX !== undefined && result.scaleY !== undefined) {
        // 缩放变换
        this.selectedShapes.forEach(shape => {
          const state = this.transformStartState.get(shape);
          if (!state) return;

          // 相对于中心点缩放位置
          const relX = state.x - centerX;
          const relY = state.y - centerY;
          shape.x = centerX + relX * result.scaleX!;
          shape.y = centerY + relY * result.scaleY!;

          // 缩放尺寸
          if ('width' in shape && 'height' in shape && state.width && state.height) {
            (shape as any).width = state.width * result.scaleX!;
            (shape as any).height = state.height * result.scaleY!;
          }
        });
      }
    }

    this.editor.renderer.requestRender();
  }

  private setSelection(shapes: Shape[]): void {
    this.selectedShapes = shapes;
    // 可以触发事件通知外部
  }

  private toggleSelection(shape: Shape): void {
    const index = this.selectedShapes.indexOf(shape);
    if (index > -1) {
      this.selectedShapes.splice(index, 1);
    } else {
      this.selectedShapes.push(shape);
    }
  }

  private clearSelection(): void {
    this.setSelection([]);
  }

  /**
   * 获取选中的图形
   */
  getSelectedShapes(): Shape[] {
    return this.selectedShapes;
  }

  /**
   * 获取选中图形的联合包围盒
   */
  private getSelectionBounds(): AABB | null {
    if (this.selectedShapes.length === 0) return null;

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
   * 获取选中图形的旋转角度
   * 如果只选中一个图形，返回其旋转角度；否则返回 0
   */
  private getSelectionRotation(): number {
    if (this.selectedShapes.length === 1 && 'rotation' in this.selectedShapes[0]) {
      return (this.selectedShapes[0] as any).rotation || 0;
    }
    return 0;
  }

  /**
   * 保存变换开始时的状态（用于实时变换）
   */
  private saveTransformStartState(): void {
    this.transformStartState.clear();
    this.selectedShapes.forEach(shape => {
      this.transformStartState.set(shape, {
        x: shape.x,
        y: shape.y,
        width: (shape as any).width,
        height: (shape as any).height,
        rotation: (shape as any).rotation,
      });
    });
  }

  /**
   * 渲染工具层（选择框、变换控制点）
   */
  render(ctx: CanvasRenderingContext2D): void {
    // 渲染选中图形的边框和变换控制点
    if (this.selectedShapes.length > 0) {
      ctx.save();

      // 应用视图变换
      const viewMatrix = this.editor.getViewMatrix();
      ctx.transform(
        viewMatrix.a,
        viewMatrix.b,
        viewMatrix.c,
        viewMatrix.d,
        viewMatrix.e,
        viewMatrix.f
      );

      const selectionBounds = this.getSelectionBounds();
      if (selectionBounds) {
        // 渲染选择框
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2 / this.editor.getZoom();
        ctx.setLineDash([5 / this.editor.getZoom(), 5 / this.editor.getZoom()]);
        ctx.strokeRect(
          selectionBounds.minX,
          selectionBounds.minY,
          selectionBounds.maxX - selectionBounds.minX,
          selectionBounds.maxY - selectionBounds.minY
        );
        ctx.setLineDash([]);

        // 渲染变换控制点
        const rotation = this.getSelectionRotation();
        this.transformHandle.render(ctx, selectionBounds, this.editor.getZoom(), rotation);
      }

      ctx.restore();
    }

    // 渲染框选框
    if (
      this.mode === SelectMode.BOX_SELECT &&
      this.boxSelectStart &&
      this.boxSelectEnd
    ) {
      ctx.save();

      // 应用视图变换
      const viewMatrix = this.editor.getViewMatrix();
      ctx.transform(
        viewMatrix.a,
        viewMatrix.b,
        viewMatrix.c,
        viewMatrix.d,
        viewMatrix.e,
        viewMatrix.f
      );

      const x = Math.min(this.boxSelectStart.x, this.boxSelectEnd.x);
      const y = Math.min(this.boxSelectStart.y, this.boxSelectEnd.y);
      const width = Math.abs(this.boxSelectEnd.x - this.boxSelectStart.x);
      const height = Math.abs(this.boxSelectEnd.y - this.boxSelectStart.y);

      // 填充
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(x, y, width, height);

      // 边框
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1 / this.editor.getZoom();
      ctx.strokeRect(x, y, width, height);

      ctx.restore();
    }
  }

  getCursor(): string {
    // 变换控制点的光标
    if (this.hoveredHandle && this.mode === SelectMode.IDLE) {
      const rotation = this.getSelectionRotation();
      return this.transformHandle.getCursor(this.hoveredHandle, rotation);
    }

    // 拖拽时的光标
    if (this.mode === SelectMode.DRAGGING) {
      return 'move';
    }

    return 'default';
  }
}
