/**
 * 圆形绘制工具
 */
import { Tool, type ToolEvent } from './Tool';
import { Circle } from '../shapes';
import { AddShapeCommand } from '../commands';
import type { Editor } from '../Editor';
import type { Vector } from '../math';

export class CircleTool extends Tool {
  readonly name = 'circle';
  readonly icon = 'circle';
  readonly shortcut = 'C';

  private editor: Editor;
  private startPoint: Vector | null = null;
  private previewCircle: Circle | null = null;
  private isDrawing = false;

  constructor(editor: Editor) {
    super();
    this.editor = editor;
  }

  onPointerDown(event: ToolEvent): void {
    this.startPoint = event.point;
    this.isDrawing = true;

    this.previewCircle = new Circle({
      x: event.point.x,
      y: event.point.y,
      radius: 0,
      style: {
        fillStyle: 'rgba(16, 185, 129, 0.3)',
        strokeStyle: '#10b981',
        lineWidth: 2
      }
    });

    this.editor.scene.add(this.previewCircle);
  }

  onPointerMove(event: ToolEvent): void {
    if (!this.startPoint || !this.previewCircle || !this.isDrawing) return;

    const dx = event.point.x - this.startPoint.x;
    const dy = event.point.y - this.startPoint.y;
    const radius = Math.sqrt(dx * dx + dy * dy);

    this.previewCircle.radius = radius;
    this.editor.renderer.requestRender();
  }

  onPointerUp(event: ToolEvent): void {
    if (!this.isDrawing || !this.previewCircle) return;

    // 移除预览
    this.editor.scene.remove(this.previewCircle);

    // 创建正式圆形
    if (this.previewCircle.radius > 5) {
      const circle = new Circle({
        x: this.previewCircle.x,
        y: this.previewCircle.y,
        radius: this.previewCircle.radius,
        style: {
          fillStyle: '#10b981',
          strokeStyle: '#047857',
          lineWidth: 2
        }
      });

      // 使用命令系统添加图形，支持撤销/重做
      const command = new AddShapeCommand(circle, this.editor.scene);
      this.editor.commandManager.execute(command);
    }

    this.startPoint = null;
    this.previewCircle = null;
    this.isDrawing = false;
    this.editor.renderer.requestRender();
  }

  protected onDeactivate(): void {
    if (this.previewCircle) {
      this.editor.scene.remove(this.previewCircle);
      this.previewCircle = null;
    }
    this.startPoint = null;
    this.isDrawing = false;
    this.editor.renderer.requestRender();
  }

  getCursor(): string {
    return 'crosshair';
  }
}
