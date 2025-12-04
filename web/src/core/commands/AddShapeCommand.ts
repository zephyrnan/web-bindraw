/**
 * 添加图形命令
 */
import { Command, type CommandContext } from './Command';
import type { Shape } from '../shapes';
import type { Scene } from '../Scene';

export class AddShapeCommand extends Command {
  readonly name = 'AddShape';
  readonly description: string;

  constructor(
    private shape: Shape,
    private scene: Scene
  ) {
    super();
    this.description = `添加${shape.name || '图形'}`;
  }

  execute(): void {
    this.scene.add(this.shape);
  }

  undo(): void {
    this.scene.remove(this.shape);
  }
}
