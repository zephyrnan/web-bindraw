/**
 * CommandManager 测试
 *
 * 测试要点：
 * 1. 命令执行和历史记录
 * 2. 撤销/重做功能
 * 3. 命令合并
 * 4. 历史记录限制
 * 5. 状态变化回调
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommandManager } from '../CommandManager';
import { Command, type CommandContext } from '../Command';

// 创建测试用的简单命令
class TestCommand extends Command {
  readonly name = 'test-command';
  readonly description = 'A test command';

  constructor(
    public value: number,
    public executed = false,
    public undone = false
  ) {
    super();
  }

  execute(context?: CommandContext): void {
    this.executed = true;
    this.undone = false;
  }

  undo(context?: CommandContext): void {
    this.undone = true;
    this.executed = false;
  }
}

// 创建可合并的命令
class MergeableCommand extends Command {
  readonly name = 'mergeable-command';

  constructor(public value: number) {
    super();
  }

  execute(context?: CommandContext): void {
    // 执行逻辑
  }

  undo(context?: CommandContext): void {
    // 撤销逻辑
  }

  canMerge(other: Command): boolean {
    return other instanceof MergeableCommand;
  }

  merge(other: Command): void {
    if (other instanceof MergeableCommand) {
      this.value += other.value;
    }
  }
}

describe('CommandManager', () => {
  let manager: CommandManager;

  beforeEach(() => {
    manager = new CommandManager();
  });

  describe('基本执行和撤销', () => {
    it('应该执行命令', async () => {
      const command = new TestCommand(1);

      await manager.execute(command);

      expect(command.executed).toBe(true);
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });

    it('应该撤销命令', async () => {
      const command = new TestCommand(1);

      await manager.execute(command);
      await manager.undo();

      expect(command.undone).toBe(true);
      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(true);
    });

    it('应该重做命令', async () => {
      const command = new TestCommand(1);

      await manager.execute(command);
      await manager.undo();
      await manager.redo();

      expect(command.executed).toBe(true);
      expect(command.undone).toBe(false);
      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(false);
    });

    it('空栈不应该撤销', async () => {
      expect(manager.canUndo()).toBe(false);
      await manager.undo();
      expect(manager.canUndo()).toBe(false);
    });

    it('空栈不应该重做', async () => {
      expect(manager.canRedo()).toBe(false);
      await manager.redo();
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('多命令操作', () => {
    it('应该按顺序执行多个命令', async () => {
      const cmd1 = new TestCommand(1);
      const cmd2 = new TestCommand(2);
      const cmd3 = new TestCommand(3);

      await manager.execute(cmd1);
      await manager.execute(cmd2);
      await manager.execute(cmd3);

      expect(cmd1.executed).toBe(true);
      expect(cmd2.executed).toBe(true);
      expect(cmd3.executed).toBe(true);
    });

    it('应该按相反顺序撤销命令', async () => {
      const cmd1 = new TestCommand(1);
      const cmd2 = new TestCommand(2);
      const cmd3 = new TestCommand(3);

      await manager.execute(cmd1);
      await manager.execute(cmd2);
      await manager.execute(cmd3);

      await manager.undo();
      expect(cmd3.undone).toBe(true);
      expect(cmd2.undone).toBe(false);

      await manager.undo();
      expect(cmd2.undone).toBe(true);
      expect(cmd1.undone).toBe(false);

      await manager.undo();
      expect(cmd1.undone).toBe(true);
    });

    it('应该按顺序重做命令', async () => {
      const cmd1 = new TestCommand(1);
      const cmd2 = new TestCommand(2);

      await manager.execute(cmd1);
      await manager.execute(cmd2);
      await manager.undo();
      await manager.undo();

      await manager.redo();
      expect(cmd1.executed).toBe(true);
      expect(cmd2.executed).toBe(false);

      await manager.redo();
      expect(cmd2.executed).toBe(true);
    });
  });

  describe('重做栈清空', () => {
    it('执行新命令应该清空重做栈', async () => {
      const cmd1 = new TestCommand(1);
      const cmd2 = new TestCommand(2);
      const cmd3 = new TestCommand(3);

      await manager.execute(cmd1);
      await manager.execute(cmd2);
      await manager.undo();
      await manager.undo();

      expect(manager.canRedo()).toBe(true);

      await manager.execute(cmd3);

      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('命令合并', () => {
    it('应该合并可合并的命令', async () => {
      const cmd1 = new MergeableCommand(5);
      const cmd2 = new MergeableCommand(10);

      await manager.execute(cmd1);
      await manager.execute(cmd2);

      const history = manager.getHistory();
      expect(history.undo.length).toBe(1);
      expect((history.undo[0] as MergeableCommand).value).toBe(15);
    });

    it('不应该合并不可合并的命令', async () => {
      const cmd1 = new TestCommand(1);
      const cmd2 = new TestCommand(2);

      await manager.execute(cmd1);
      await manager.execute(cmd2);

      const history = manager.getHistory();
      expect(history.undo.length).toBe(2);
    });
  });

  describe('历史记录限制', () => {
    it('应该限制历史记录数量', async () => {
      const manager = new CommandManager({ maxHistory: 3 });

      for (let i = 0; i < 5; i++) {
        await manager.execute(new TestCommand(i));
      }

      const history = manager.getHistory();
      expect(history.undo.length).toBe(3);
      expect((history.undo[0] as TestCommand).value).toBe(2); // 最早的命令被移除
    });

    it('默认历史记录限制应该为100', async () => {
      const manager = new CommandManager();

      for (let i = 0; i < 105; i++) {
        await manager.execute(new TestCommand(i));
      }

      const history = manager.getHistory();
      expect(history.undo.length).toBe(100);
    });
  });

  describe('清空历史', () => {
    it('应该清空撤销和重做栈', async () => {
      const cmd1 = new TestCommand(1);
      const cmd2 = new TestCommand(2);

      await manager.execute(cmd1);
      await manager.execute(cmd2);
      await manager.undo();

      expect(manager.canUndo()).toBe(true);
      expect(manager.canRedo()).toBe(true);

      manager.clear();

      expect(manager.canUndo()).toBe(false);
      expect(manager.canRedo()).toBe(false);
    });
  });

  describe('获取历史记录', () => {
    it('应该返回撤销和重做栈的快照', async () => {
      const cmd1 = new TestCommand(1);
      const cmd2 = new TestCommand(2);
      const cmd3 = new TestCommand(3);

      await manager.execute(cmd1);
      await manager.execute(cmd2);
      await manager.execute(cmd3);
      await manager.undo();

      const history = manager.getHistory();

      expect(history.undo.length).toBe(2);
      expect(history.redo.length).toBe(1);
      expect(history.undo[0]).toBe(cmd1);
      expect(history.undo[1]).toBe(cmd2);
      expect(history.redo[0]).toBe(cmd3);
    });
  });

  describe('状态变化回调', () => {
    it('执行命令应该触发回调', async () => {
      const callback = vi.fn();
      manager.onStateChange(callback);

      await manager.execute(new TestCommand(1));

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('撤销应该触发回调', async () => {
      const callback = vi.fn();
      manager.onStateChange(callback);

      await manager.execute(new TestCommand(1));
      callback.mockClear();

      await manager.undo();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('重做应该触发回调', async () => {
      const callback = vi.fn();
      manager.onStateChange(callback);

      await manager.execute(new TestCommand(1));
      await manager.undo();
      callback.mockClear();

      await manager.redo();

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('清空应该触发回调', () => {
      const callback = vi.fn();
      manager.onStateChange(callback);

      manager.clear();

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('命令上下文', () => {
    it('应该设置和使用上下文', async () => {
      const context = { someData: 'test' };
      manager.setContext(context);

      let receivedContext: CommandContext | undefined;

      class ContextCommand extends Command {
        readonly name = 'context-command';

        execute(ctx?: CommandContext): void {
          receivedContext = ctx;
        }

        undo(ctx?: CommandContext): void {}
      }

      await manager.execute(new ContextCommand());

      expect(receivedContext).toEqual(context);
    });

    it('应该合并多个上下文设置', () => {
      manager.setContext({ key1: 'value1' });
      manager.setContext({ key2: 'value2' });

      let receivedContext: CommandContext | undefined;

      class ContextCommand extends Command {
        readonly name = 'context-command';

        execute(ctx?: CommandContext): void {
          receivedContext = ctx;
        }

        undo(ctx?: CommandContext): void {}
      }

      manager.execute(new ContextCommand());

      expect(receivedContext).toEqual({ key1: 'value1', key2: 'value2' });
    });
  });

  describe('异步命令', () => {
    it('应该支持异步命令', async () => {
      class AsyncCommand extends Command {
        readonly name = 'async-command';
        executed = false;
        undone = false;

        async execute(): Promise<void> {
          await new Promise(resolve => setTimeout(resolve, 10));
          this.executed = true;
        }

        async undo(): Promise<void> {
          await new Promise(resolve => setTimeout(resolve, 10));
          this.undone = true;
        }
      }

      const command = new AsyncCommand();

      await manager.execute(command);
      expect(command.executed).toBe(true);

      await manager.undo();
      expect(command.undone).toBe(true);
    });
  });
});
