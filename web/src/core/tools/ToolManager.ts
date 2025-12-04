/**
 * 工具管理器
 * 负责管理和切换不同的交互工具
 *
 * 面试考点：
 * 1. 状态模式 - 不同工具代表不同的状态
 * 2. 策略模式 - 不同工具有不同的交互策略
 * 3. 如何避免大量 if-else？—— 用对象映射 + 多态
 */

import type { Editor } from '../Editor';
import type { Vector } from '../math';
import { Tool, type ToolEvent } from './Tool';
import { SelectTool } from './SelectTool';
import { RectTool } from './RectTool';
import { CircleTool } from './CircleTool';
import { PenTool } from './PenTool';
import { BrushTool } from './BrushTool';

export type ToolType = 'select' | 'rect' | 'circle' | 'pen' | 'brush';

/**
 * 工具管理器
 */
export class ToolManager {
  private editor: Editor;

  /** 所有注册的工具 */
  private tools = new Map<string, Tool>();

  /** 当前激活的工具 */
  private currentTool: Tool | null = null;

  /** 当前工具类型 */
  private currentToolType: ToolType = 'select';

  constructor(editor: Editor) {
    this.editor = editor;

    // 注册默认工具
    this.registerTool('select', new SelectTool(editor));
    this.registerTool('rect', new RectTool(editor));
    this.registerTool('circle', new CircleTool(editor));
    this.registerTool('pen', new PenTool(editor));
    this.registerTool('brush', new BrushTool(editor));

    // 默认激活选择工具
    this.setTool('select');
  }

  /**
   * 注册工具
   */
  registerTool(type: string, tool: Tool): void {
    this.tools.set(type, tool);
  }

  /**
   * 获取工具
   */
  getTool(type: string): Tool | undefined {
    return this.tools.get(type);
  }

  /**
   * 设置当前工具
   */
  setTool(type: ToolType): void {
    const tool = this.tools.get(type);

    if (!tool) {
      console.warn(`[ToolManager] Tool "${type}" not found`);
      return;
    }

    // 停用当前工具
    if (this.currentTool) {
      this.currentTool.deactivate();
    }

    // 激活新工具
    this.currentTool = tool;
    this.currentToolType = type;
    this.currentTool.activate();

    // 更新光标
    this.updateCursor();

    console.log(`[ToolManager] Tool changed to "${type}"`);
  }

  /**
   * 获取当前工具
   */
  getCurrentTool(): Tool | null {
    return this.currentTool;
  }

  /**
   * 获取当前工具类型
   */
  getCurrentToolType(): ToolType {
    return this.currentToolType;
  }

  /**
   * 更新光标样式
   */
  private updateCursor(): void {
    if (this.currentTool) {
      this.editor.canvas.style.cursor = this.currentTool.getCursor();
    }
  }

  /**
   * 鼠标按下
   */
  onMouseDown(point: Vector, originalEvent: MouseEvent | TouchEvent): void {
    if (!this.currentTool) return;

    const toolEvent: ToolEvent = {
      point,
      originalEvent,
      shiftKey: 'shiftKey' in originalEvent ? originalEvent.shiftKey : false,
      ctrlKey: 'ctrlKey' in originalEvent ? originalEvent.ctrlKey : false,
      altKey: 'altKey' in originalEvent ? originalEvent.altKey : false,
    };

    this.currentTool.onPointerDown(toolEvent);
  }

  /**
   * 鼠标移动
   */
  onMouseMove(point: Vector, originalEvent: MouseEvent | TouchEvent): void {
    if (!this.currentTool) return;

    const toolEvent: ToolEvent = {
      point,
      originalEvent,
      shiftKey: 'shiftKey' in originalEvent ? originalEvent.shiftKey : false,
      ctrlKey: 'ctrlKey' in originalEvent ? originalEvent.ctrlKey : false,
      altKey: 'altKey' in originalEvent ? originalEvent.altKey : false,
    };

    this.currentTool.onPointerMove(toolEvent);
  }

  /**
   * 鼠标抬起
   */
  onMouseUp(point: Vector, originalEvent: MouseEvent | TouchEvent): void {
    if (!this.currentTool) return;

    const toolEvent: ToolEvent = {
      point,
      originalEvent,
      shiftKey: 'shiftKey' in originalEvent ? originalEvent.shiftKey : false,
      ctrlKey: 'ctrlKey' in originalEvent ? originalEvent.ctrlKey : false,
      altKey: 'altKey' in originalEvent ? originalEvent.altKey : false,
    };

    this.currentTool.onPointerUp(toolEvent);
  }

  /**
   * 键盘按下
   */
  onKeyDown(event: KeyboardEvent): void {
    // 快捷键切换工具
    const keyToTool: Record<string, ToolType> = {
      v: 'select',
      r: 'rect',
      c: 'circle',
      p: 'pen',
      b: 'brush',
    };

    const toolType = keyToTool[event.key.toLowerCase()];
    if (toolType) {
      this.setTool(toolType);
      return;
    }

    // 传递给当前工具
    if (this.currentTool && this.currentTool.onKeyDown) {
      this.currentTool.onKeyDown(event);
    }
  }

  /**
   * 键盘抬起
   */
  onKeyUp(event: KeyboardEvent): void {
    if (this.currentTool && this.currentTool.onKeyUp) {
      this.currentTool.onKeyUp(event);
    }
  }

  /**
   * 获取所有工具
   */
  getAllTools(): Map<string, Tool> {
    return this.tools;
  }
}
