/**
 * 命令管理器
 * 管理命令的执行、撤销、重做
 *
 * 面试考点：如何设计撤销/重做系统
 */
import { Command, type CommandContext } from './Command';

export interface CommandManagerOptions {
  /** 最大历史记录数 */
  maxHistory?: number;
}

export class CommandManager {
  /** 撤销栈 */
  private undoStack: Command[] = [];
  /** 重做栈 */
  private redoStack: Command[] = [];
  /** 最大历史记录数 */
  private maxHistory: number;
  /** 命令执行上下文 */
  private context: CommandContext = {};

  /** 状态变化回调 */
  private onStateChangeCallback?: () => void;

  constructor(options: CommandManagerOptions = {}) {
    this.maxHistory = options.maxHistory ?? 100;
  }

  /**
   * 设置命令执行上下文
   */
  setContext(context: CommandContext): void {
    this.context = { ...this.context, ...context };
  }

  /**
   * 执行命令
   */
  async execute(command: Command): Promise<void> {
    await command.execute(this.context);

    // 尝试与栈顶命令合并
    const lastCommand = this.undoStack[this.undoStack.length - 1];
    if (lastCommand && command.canMerge(lastCommand)) {
      lastCommand.merge(command);
    } else {
      // 添加到撤销栈
      this.undoStack.push(command);

      // 限制历史记录数
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
    }

    // 清空重做栈
    this.redoStack = [];

    this.notifyStateChange();
  }

  /**
   * 撤销
   */
  async undo(): Promise<void> {
    const command = this.undoStack.pop();
    if (!command) return;

    await command.undo(this.context);
    this.redoStack.push(command);

    this.notifyStateChange();
  }

  /**
   * 重做
   */
  async redo(): Promise<void> {
    const command = this.redoStack.pop();
    if (!command) return;

    await command.execute(this.context);
    this.undoStack.push(command);

    this.notifyStateChange();
  }

  /**
   * 是否可以撤销
   */
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  /**
   * 是否可以重做
   */
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  /**
   * 清空历史记录
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.notifyStateChange();
  }

  /**
   * 获取历史记录
   */
  getHistory(): { undo: Command[]; redo: Command[] } {
    return {
      undo: [...this.undoStack],
      redo: [...this.redoStack]
    };
  }

  /**
   * 设置状态变化回调
   */
  onStateChange(callback: () => void): void {
    this.onStateChangeCallback = callback;
  }

  private notifyStateChange(): void {
    this.onStateChangeCallback?.();
  }
}
