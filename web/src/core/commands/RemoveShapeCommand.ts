/**
 * 删除图形命令
 */
import { Command } from './Command';
import type { Shape } from '../shapes';
import type { Scene } from '../Scene';

export class RemoveShapeCommand extends Command {
  readonly name = 'RemoveShape';
  readonly description: string;

  constructor(
    private shapesToRemove: Shape[],
    private scene: Scene
  ) {
    super();
    this.description = `删除${shapesToRemove.length}个图形`;
  }

  execute(): void {
    this.scene.removeMany(this.shapesToRemove);
  }

  undo(): void {
    this.scene.addMany(this.shapesToRemove);
  }
}
