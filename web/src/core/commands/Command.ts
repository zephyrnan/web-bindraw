/**
 * 命令模式 - 抽象命令
 * 用于实现撤销/重做功能
 *
 * 面试考点：
 * 1. 命令模式的作用？—— 将操作封装成对象，支持撤销/重做/宏命令
 * 2. 如何实现撤销？—— 维护命令栈，execute时入栈，undo时出栈
 * 3. 如何实现重做？—— 维护两个栈（undoStack + redoStack）
 */

export interface CommandContext {
  /** 命令执行时可能需要的上下文数据 */
  [key: string]: unknown;
}

export abstract class Command {
  /** 命令名称（用于调试和历史记录） */
  abstract readonly name: string;

  /** 命令描述 */
  abstract readonly description?: string;

  /**
   * 执行命令
   * @param context 命令执行上下文
   */
  abstract execute(context?: CommandContext): void | Promise<void>;

  /**
   * 撤销命令
   * @param context 命令执行上下文
   */
  abstract undo(context?: CommandContext): void | Promise<void>;

  /**
   * 是否可以与其他命令合并
   * 用于优化连续的相似操作（如连续拖拽）
   */
  canMerge(other: Command): boolean {
    return false;
  }

  /**
   * 合并其他命令
   */
  merge(other: Command): void {
    throw new Error('Merge not implemented');
  }
}
