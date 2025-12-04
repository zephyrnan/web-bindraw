/**
 * 移动图形命令
 */
import { Command } from './Command';
import type { Shape } from '../shapes';
import { Vector } from '../math';

export class MoveShapeCommand extends Command {
  readonly name = 'MoveShape';
  readonly description: string;

  private oldPositions: Map<Shape, Vector> = new Map();

  constructor(
    private shapes: Shape[],
    private dx: number,
    private dy: number
  ) {
    super();
    this.description = `移动${shapes.length}个图形`;

    // 记录原始位置
    shapes.forEach(shape => {
      this.oldPositions.set(shape, new Vector(shape.x, shape.y));
    });
  }

  execute(): void {
    this.shapes.forEach(shape => {
      shape.x += this.dx;
      shape.y += this.dy;
    });
  }

  undo(): void {
    this.shapes.forEach(shape => {
      const oldPos = this.oldPositions.get(shape);
      if (oldPos) {
        shape.x = oldPos.x;
        shape.y = oldPos.y;
      }
    });
  }

  /**
   * 可以与其他移动命令合并
   */
  canMerge(other: Command): boolean {
    return other instanceof MoveShapeCommand &&
           other.shapes.length === this.shapes.length &&
           other.shapes.every(s => this.shapes.includes(s));
  }

  /**
   * 合并移动增量
   */
  merge(other: Command): void {
    if (other instanceof MoveShapeCommand) {
      this.dx += other.dx;
      this.dy += other.dy;
    }
  }
}
