/**
 * 画笔/自由绘制工具
 * 拖动绘制平滑的笔迹
 */
import { Tool, type ToolEvent } from './Tool';
import { Line } from '../shapes';
import { Vector } from '../math';
import { AddShapeCommand } from '../commands';
import { PathSmoothing } from '../utils/PathSmoothing';
import type { Editor } from '../Editor';

export class BrushTool extends Tool {
  readonly name = 'brush';
  readonly icon = 'paintbrush';
  readonly shortcut = 'B';

  private editor: Editor;
  private isDrawing = false;
  private points: Vector[] = [];
  private previewLine: Line | null = null;
  private lastPoint: Vector | null = null;
  private minDistance = 2; // 最小点间距，用于控制采样

  constructor(editor: Editor) {
    super();
    this.editor = editor;
  }

  onPointerDown(event: ToolEvent): void {
    this.isDrawing = true;
    this.points = [new Vector(event.point.x, event.point.y)];
    this.lastPoint = event.point;

    // 创建预览线
    this.previewLine = new Line({
      points: [...this.points],
      smooth: true,
      smoothAlgorithm: 'catmullRom',
      style: {
        strokeStyle: '#8b5cf6',
        lineWidth: 2,
        fillStyle: null
      }
    });
    this.editor.scene.add(this.previewLine);
  }

  onPointerMove(event: ToolEvent): void {
    if (!this.isDrawing || !this.previewLine || !this.lastPoint) return;

    const currentPoint = event.point;
    const distance = this.lastPoint.distanceTo(currentPoint);

    // 只有当移动距离超过最小距离时才添加点
    if (distance >= this.minDistance) {
      this.points.push(new Vector(currentPoint.x, currentPoint.y));
      this.lastPoint = currentPoint;

      // 实时简化点集，避免点太多
      if (this.points.length > 100) {
        this.points = PathSmoothing.simplify(this.points, 1);
      }

      // 更新预览
      this.previewLine.points = [...this.points];
      this.editor.renderer.requestRender();
    }
  }

  onPointerUp(event: ToolEvent): void {
    if (!this.isDrawing) return;

    this.isDrawing = false;

    if (this.previewLine && this.points.length > 1) {
      // 移除预览线
      this.editor.scene.remove(this.previewLine);

      // 对最终路径进行优化平滑
      const optimizedPoints = PathSmoothing.adaptiveSmooth(this.points);

      // 创建正式线条
      const line = new Line({
        points: optimizedPoints,
        smooth: true,
        smoothAlgorithm: 'catmullRom',
        style: {
          strokeStyle: '#8b5cf6',
          lineWidth: 2,
          fillStyle: null,
          lineCap: 'round',
          lineJoin: 'round'
        }
      });

      const command = new AddShapeCommand(line, this.editor.scene);
      this.editor.commandManager.execute(command);
    } else if (this.previewLine) {
      // 点数不足，移除预览
      this.editor.scene.remove(this.previewLine);
    }

    this.previewLine = null;
    this.points = [];
    this.lastPoint = null;
    this.editor.renderer.requestRender();
  }

  protected onDeactivate(): void {
    if (this.isDrawing && this.previewLine) {
      this.editor.scene.remove(this.previewLine);
      this.previewLine = null;
    }
    this.isDrawing = false;
    this.points = [];
    this.lastPoint = null;
  }

  getCursor(): string {
    return 'crosshair';
  }
}
