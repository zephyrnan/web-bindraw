/**
 * 矩形绘制工具
 *
 * 面试考点：
 * 1. 如何实现实时预览？—— 在 onMove 中更新临时图形
 * 2. 如何保持正方形？—— Shift键约束，取宽高最小值
 * 3. 如何优化性能？—— 只在 onUp 时才真正创建图形
 */
import { Tool, type ToolEvent } from './Tool';
import { Rect } from '../shapes';
import { AddShapeCommand } from '../commands';
import type { Editor } from '../Editor';
import type { Vector } from '../math';

export class RectTool extends Tool {
  readonly name = 'rect';
  readonly icon = 'square';
  readonly shortcut = 'R';

  private editor: Editor;
  private startPoint: Vector | null = null;
  private previewRect: Rect | null = null;
  private isDrawing = false;

  constructor(editor: Editor) {
    super();
    this.editor = editor;
  }

  onPointerDown(event: ToolEvent): void {
    this.startPoint = event.point;
    this.isDrawing = true;

    // 创建预览矩形
    this.previewRect = new Rect({
      x: event.point.x,
      y: event.point.y,
      width: 0,
      height: 0,
      style: {
        fillStyle: 'rgba(59, 130, 246, 0.3)',
        strokeStyle: '#3b82f6',
        lineWidth: 2,
      },
    });

    // 临时添加到场景以便渲染
    this.editor.scene.add(this.previewRect);
  }

  onPointerMove(event: ToolEvent): void {
    if (!this.startPoint || !this.previewRect || !this.isDrawing) return;

    const width = event.point.x - this.startPoint.x;
    const height = event.point.y - this.startPoint.y;

    // 如果按住Shift，保持正方形
    if (event.shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height));
      this.previewRect.width = Math.abs(size);
      this.previewRect.height = Math.abs(size);

      // 根据拖拽方向调整位置
      const signX = width >= 0 ? 1 : -1;
      const signY = height >= 0 ? 1 : -1;
      this.previewRect.x = this.startPoint.x + (signX * size) / 2;
      this.previewRect.y = this.startPoint.y + (signY * size) / 2;
    } else {
      this.previewRect.width = Math.abs(width);
      this.previewRect.height = Math.abs(height);
      this.previewRect.x = this.startPoint.x + width / 2;
      this.previewRect.y = this.startPoint.y + height / 2;
    }

    this.editor.renderer.requestRender();
  }

  onPointerUp(event: ToolEvent): void {
    if (!this.isDrawing || !this.previewRect) return;

    // 移除预览矩形
    if (this.previewRect) {
      this.editor.scene.remove(this.previewRect);
    }

    // 只有在大小足够时才创建正式矩形
    if (this.previewRect.width > 5 && this.previewRect.height > 5) {
      const rect = new Rect({
        x: this.previewRect.x,
        y: this.previewRect.y,
        width: this.previewRect.width,
        height: this.previewRect.height,
        style: {
          fillStyle: '#3b82f6',
          strokeStyle: '#1e40af',
          lineWidth: 2,
        },
      });

      // 使用命令系统添加图形，支持撤销/重做
      const command = new AddShapeCommand(rect, this.editor.scene);
      this.editor.commandManager.execute(command);
    }

    this.startPoint = null;
    this.previewRect = null;
    this.isDrawing = false;

    this.editor.renderer.requestRender();
  }

  protected onActivate(): void {
    console.log('[RectTool] Activated');
  }

  protected onDeactivate(): void {
    // 清理未完成的绘制
    if (this.previewRect) {
      this.editor.scene.remove(this.previewRect);
      this.previewRect = null;
    }
    this.startPoint = null;
    this.isDrawing = false;
    this.editor.renderer.requestRender();
    console.log('[RectTool] Deactivated');
  }

  getCursor(): string {
    return 'crosshair';
  }
}
