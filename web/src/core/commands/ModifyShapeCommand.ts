/**
 * 修改图形属性命令
 */
import { Command } from './Command';
import type { Shape } from '../shapes';

export class ModifyShapeCommand extends Command {
  readonly name = 'ModifyShape';
  readonly description: string;

  private oldValues: Map<Shape, Map<string, any>> = new Map();

  constructor(
    private shapes: Shape[],
    private property: string,
    private newValue: any
  ) {
    super();
    this.description = `修改${shapes.length}个图形的${property}`;

    // 记录旧值
    shapes.forEach(shape => {
      const values = new Map();
      values.set(property, (shape as any)[property]);
      this.oldValues.set(shape, values);
    });
  }

  execute(): void {
    this.shapes.forEach(shape => {
      (shape as any)[this.property] = this.newValue;
    });
  }

  undo(): void {
    this.shapes.forEach(shape => {
      const values = this.oldValues.get(shape);
      if (values) {
        (shape as any)[this.property] = values.get(this.property);
      }
    });
  }
}
