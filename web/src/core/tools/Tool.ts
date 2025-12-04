/**
 * 工具基类
 * 所有交互工具的抽象基类
 *
 * 面试考点：
 * 1. 策略模式 - 不同工具实现不同的交互策略
 * 2. 状态管理 - 工具如何管理自己的状态
 */
import type { Shape } from '../shapes';
import type { Vector } from '../math';

export interface ToolEvent {
  /** 鼠标/触摸点位置（世界坐标） */
  point: Vector;
  /** 原始事件对象 */
  originalEvent: MouseEvent | TouchEvent;
  /** 是否按下Shift键 */
  shiftKey: boolean;
  /** 是否按下Ctrl/Cmd键 */
  ctrlKey: boolean;
  /** 是否按下Alt键 */
  altKey: boolean;
}

export abstract class Tool {
  /** 工具名称 */
  abstract readonly name: string;
  /** 工具图标（可选） */
  abstract readonly icon?: string;
  /** 工具快捷键 */
  abstract readonly shortcut?: string;

  /** 是否正在使用工具 */
  protected isActive = false;

  /**
   * 激活工具
   */
  activate(): void {
    this.isActive = true;
    this.onActivate();
  }

  /**
   * 停用工具
   */
  deactivate(): void {
    this.isActive = false;
    this.onDeactivate();
  }

  /**
   * 鼠标按下
   */
  abstract onPointerDown(event: ToolEvent): void;

  /**
   * 鼠标移动
   */
  abstract onPointerMove(event: ToolEvent): void;

  /**
   * 鼠标释放
   */
  abstract onPointerUp(event: ToolEvent): void;

  /**
   * 键盘按下
   */
  onKeyDown?(event: KeyboardEvent): void;

  /**
   * 键盘释放
   */
  onKeyUp?(event: KeyboardEvent): void;

  /**
   * 渲染工具层（可选）
   * 用于绘制工具相关的可视化元素
   */
  render?(ctx: CanvasRenderingContext2D): void;

  /**
   * 工具被激活时的回调
   */
  protected onActivate(): void {}

  /**
   * 工具被停用时的回调
   */
  protected onDeactivate(): void {}

  /**
   * 获取鼠标光标样式
   */
  getCursor(): string {
    return 'default';
  }
}
