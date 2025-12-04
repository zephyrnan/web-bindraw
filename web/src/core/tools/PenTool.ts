/**
 * 钢笔/线条绘制工具
 */
import { Tool, type ToolEvent } from './Tool';
import { Line } from '../shapes';
import { Vector } from '../math';
import { AddShapeCommand } from '../commands';
import type { Editor } from '../Editor';

export class PenTool extends Tool {
  readonly name = 'pen';
  readonly icon = 'pen';
  readonly shortcut = 'P';

  private editor: Editor;
  private points: Vector[] = [];
  private previewLine: Line | null = null;

  constructor(editor: Editor) {
    super();
    this.editor = editor;
  }

  onPointerDown(event: ToolEvent): void {
    this.points.push(new Vector(event.point.x, event.point.y));

    if (!this.previewLine) {
      this.previewLine = new Line({
        points: [...this.points],
        style: {
          strokeStyle: '#8b5cf6',
          lineWidth: 2
        }
      });
      this.editor.scene.add(this.previewLine);
    } else {
      this.previewLine.points = [...this.points];
      this.editor.renderer.requestRender();
    }
  }

  onPointerMove(event: ToolEvent): void {
    // 钢笔工具在移动时不做处理，只在点击时添加点
  }

  onPointerUp(event: ToolEvent): void {
    // 每次点击添加点，不在这里做处理
  }

  onKeyDown(event: KeyboardEvent): void {
    // 按Enter或Escape完成绘制
    if (event.key === 'Enter' || event.key === 'Escape') {
      this.finishDrawing();
    }
  }

  private finishDrawing(): void {
    if (this.previewLine && this.points.length > 1) {
      // 移除预览线
      this.editor.scene.remove(this.previewLine);

      // 创建正式线条并使用命令系统添加
      const line = new Line({
        points: [...this.points],
        style: {
          strokeStyle: '#8b5cf6',
          lineWidth: 2
        }
      });

      const command = new AddShapeCommand(line, this.editor.scene);
      this.editor.commandManager.execute(command);

      this.previewLine = null;
    } else if (this.previewLine) {
      // 点数不足，移除预览
      this.editor.scene.remove(this.previewLine);
      this.previewLine = null;
    }

    this.points = [];
    this.editor.renderer.requestRender();
  }

  protected onDeactivate(): void {
    this.finishDrawing();
  }

  getCursor(): string {
    return 'crosshair';
  }
}
