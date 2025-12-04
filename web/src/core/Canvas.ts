/**
 * Canvas核心类
 * 整合所有模块，提供完整的画布功能
 *
 * 面试考点：
 * 1. 如何设计一个可扩展的Canvas系统？
 * 2. 如何处理用户交互？
 * 3. 如何实现撤销/重做？
 */
import { Renderer, type RendererOptions } from './Renderer';
import { SelectionManager } from './SelectionManager';
import { CommandManager } from './commands';
import { Scene } from './Scene';
import { Tool } from './tools';
import type { Shape } from './shapes';
import { Vector, Matrix } from './math';
import { AddShapeCommand, RemoveShapeCommand, MoveShapeCommand } from './commands';
import { SelectTool, RectTool, CircleTool, PenTool } from './tools';

export interface CanvasOptions {
  /** Canvas元素（可选，用于简化接口） */
  canvas?: HTMLCanvasElement;
  /** 宽度 */
  width?: number;
  /** 高度 */
  height?: number;
  /** 背景色 */
  backgroundColor?: string;
  /** 渲染器选项 */
  rendererOptions?: Partial<RendererOptions>;
  /** 最大历史记录数 */
  maxHistory?: number;
}

export class Canvas {
  /** 渲染器 */
  private renderer: Renderer;

  /** 选择管理器 */
  private selectionManager: SelectionManager;

  /** 命令管理器 */
  private commandManager: CommandManager;

  /** 场景管理器（内部使用） */
  private scene: Scene;

  /** 当前工具 */
  private currentTool: Tool | null = null;

  /** 视口平移 */
  private pan = { x: 0, y: 0 };

  /** 视口缩放 */
  private zoom = 1;

  /** 是否正在拖拽画布 */
  private isPanning = false;
  private lastPanPoint: Vector | null = null;

  /** Canvas 元素 */
  private canvasElement: HTMLCanvasElement;

  /** 选择变化回调 */
  private selectionChangeCallbacks: Array<(shapes: Shape[]) => void> = [];

  constructor(canvasOrOptions: HTMLCanvasElement | CanvasOptions, options?: Partial<CanvasOptions>) {
    // 兼容两种构造方式
    let canvas: HTMLCanvasElement;
    let opts: CanvasOptions;

    if (canvasOrOptions instanceof HTMLCanvasElement) {
      canvas = canvasOrOptions;
      opts = { canvas, ...options };
    } else {
      if (!canvasOrOptions.canvas) {
        throw new Error('Canvas element is required');
      }
      canvas = canvasOrOptions.canvas;
      opts = canvasOrOptions;
    }

    this.canvasElement = canvas;

    // 初始化场景
    this.scene = new Scene({ autoSort: true });

    // 初始化渲染器
    this.renderer = new Renderer({
      canvas,
      enableHiDPI: true,
      backgroundColor: opts.backgroundColor,
      ...opts.rendererOptions
    });

    // 初始化选择管理器
    this.selectionManager = new SelectionManager();
    this.selectionManager.onChange(() => {
      const selected = this.selectionManager.getSelection();
      this.selectionChangeCallbacks.forEach(cb => cb(selected));
      this.render();
    });

    // 初始化命令管理器
    this.commandManager = new CommandManager({
      maxHistory: opts.maxHistory
    });
    this.commandManager.onStateChange(() => {
      this.render();
    });

    // 绑定事件
    this.bindEvents(canvas);

    // 初始渲染
    this.render();
  }

  /**
   * 添加图形
   */
  addShape(shape: Shape): void {
    const command = new AddShapeCommand(shape, this.scene);
    this.commandManager.execute(command);
    this.render();
  }

  /**
   * 删除图形
   */
  removeShape(shape: Shape): void {
    const command = new RemoveShapeCommand([shape], this.scene);
    this.commandManager.execute(command);
    this.render();
  }

  /**
   * 清空所有图形
   */
  clear(): void {
    this.scene.clear();
    this.selectionManager.clear();
    this.render();
  }

  /**
   * 删除选中的图形
   */
  deleteSelected(): void {
    const selected = this.selectionManager.getSelection();
    if (selected.length === 0) return;

    const command = new RemoveShapeCommand(selected, this.scene);
    this.commandManager.execute(command);
    this.selectionManager.clear();
    this.render();
  }

  /**
   * 设置当前工具（支持工具实例或工具名称）
   */
  setTool(toolOrName: Tool | string): void {
    let tool: Tool;

    if (typeof toolOrName === 'string') {
      // 创建一个伪 Editor 适配器，提供工具所需的基本接口
      const editorAdapter = {
        scene: this.scene,
        renderer: {
          requestRender: () => this.render(),
        },
        commandManager: this.commandManager,
        selectionManager: this.selectionManager,
      } as any;

      // 根据名称创建工具实例
      switch (toolOrName) {
        case 'select':
          tool = new SelectTool(editorAdapter);
          break;
        case 'rect':
          tool = new RectTool(editorAdapter);
          break;
        case 'circle':
          tool = new CircleTool(editorAdapter);
          break;
        case 'pen':
          tool = new PenTool(editorAdapter);
          break;
        default:
          tool = new SelectTool(editorAdapter);
      }
    } else {
      tool = toolOrName;
    }

    if (this.currentTool) {
      this.currentTool.deactivate();
    }

    this.currentTool = tool;
    tool.activate();
  }

  /**
   * 撤销
   */
  undo(): void {
    this.commandManager.undo();
  }

  /**
   * 重做
   */
  redo(): void {
    this.commandManager.redo();
  }

  /**
   * 能否撤销
   */
  canUndo(): boolean {
    return this.commandManager.canUndo();
  }

  /**
   * 能否重做
   */
  canRedo(): boolean {
    return this.commandManager.canRedo();
  }

  /**
   * 设置视口
   */
  setView(pan: { x: number; y: number }, zoom: number): void {
    this.pan = pan;
    this.zoom = zoom;
    this.renderer.setView(pan, zoom);
    this.render();
  }

  /**
   * 设置缩放
   */
  setZoom(zoom: number): void {
    this.zoom = zoom;
    this.renderer.setView(this.pan, this.zoom);
    this.render();
  }

  /**
   * 获取视口信息
   */
  getViewport() {
    return {
      pan: { ...this.pan },
      zoom: this.zoom
    };
  }

  /**
   * 缩放到适应
   */
  zoomToFit(): void {
    const shapes = this.scene.getShapes();
    if (shapes.length === 0) return;

    // 计算所有图形的包围盒
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    shapes.forEach((shape: Shape) => {
      const bounds = shape.getBoundingBox();
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const canvas = this.renderer.getCanvas();
    const canvasWidth = canvas.clientWidth;
    const canvasHeight = canvas.clientHeight;

    // 计算缩放比例（留10%边距）
    const zoom = Math.min(
      canvasWidth / width,
      canvasHeight / height
    ) * 0.9;

    // 计算居中位置
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const pan = {
      x: canvasWidth / 2 - centerX * zoom,
      y: canvasHeight / 2 - centerY * zoom
    };

    this.setView(pan, zoom);
  }

  /**
   * 渲染
   */
  render(): void {
    this.renderer.render(this.scene.getShapes());

    // 绘制选中图形的控制框
    const selected = this.selectionManager.getSelection();
    if (selected.length > 0) {
      this.renderer.drawSelectionHandles(selected);
    }
  }

  /**
   * 命中测试
   */
  private hitTest(point: Vector): Shape | null {
    return this.scene.hitTest(point);
  }

  /**
   * 绑定事件
   */
  private bindEvents(canvas: HTMLCanvasElement): void {
    // 鼠标/触摸事件
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('wheel', this.handleWheel);

    // 键盘事件
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    // 窗口调整大小
    window.addEventListener('resize', this.handleResize);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    const point = this.getCanvasPoint(e);

    // 空格键 + 鼠标拖拽 = 平移画布
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      this.isPanning = true;
      this.lastPanPoint = point;
      return;
    }

    // 传递给工具
    if (this.currentTool) {
      this.currentTool.onPointerDown({
        point,
        originalEvent: e,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey
      });
    }

    this.render();
  };

  private handlePointerMove = (e: PointerEvent): void => {
    const point = this.getCanvasPoint(e);

    // 处理画布平移
    if (this.isPanning && this.lastPanPoint) {
      this.pan.x += point.x - this.lastPanPoint.x;
      this.pan.y += point.y - this.lastPanPoint.y;
      this.lastPanPoint = point;
      this.renderer.setView(this.pan, this.zoom);
      this.render();
      return;
    }

    // 传递给工具
    if (this.currentTool) {
      this.currentTool.onPointerMove({
        point,
        originalEvent: e,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey
      });
    }

    this.render();
  };

  private handlePointerUp = (e: PointerEvent): void => {
    const point = this.getCanvasPoint(e);

    // 结束平移
    if (this.isPanning) {
      this.isPanning = false;
      this.lastPanPoint = null;
      return;
    }

    // 传递给工具
    if (this.currentTool) {
      this.currentTool.onPointerUp({
        point,
        originalEvent: e,
        shiftKey: e.shiftKey,
        ctrlKey: e.ctrlKey,
        altKey: e.altKey
      });
    }

    this.render();
  };

  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const point = this.getCanvasPoint(e);
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = this.zoom * delta;

    // 以鼠标位置为中心缩放
    this.pan.x = point.x - (point.x - this.pan.x) * (newZoom / this.zoom);
    this.pan.y = point.y - (point.y - this.pan.y) * (newZoom / this.zoom);
    this.zoom = newZoom;

    this.renderer.setView(this.pan, this.zoom);
    this.render();
  };

  private handleKeyDown = (e: KeyboardEvent): void => {
    // Delete键删除选中图形
    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.deleteSelected();
    }

    // Ctrl+Z 撤销
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      this.undo();
    }

    // Ctrl+Shift+Z 或 Ctrl+Y 重做
    if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
      this.redo();
    }

    // 传递给工具
    this.currentTool?.onKeyDown?.(e);

    this.render();
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.currentTool?.onKeyUp?.(e);
  };

  private handleResize = (): void => {
    this.renderer.updateCanvasSize();
    this.render();
  };

  /**
   * 将屏幕坐标转换为画布坐标
   */
  private getCanvasPoint(e: MouseEvent | WheelEvent): Vector {
    const rect = this.renderer.getCanvas().getBoundingClientRect();
    return new Vector(
      (e.clientX - rect.left - this.pan.x) / this.zoom,
      (e.clientY - rect.top - this.pan.y) / this.zoom
    );
  }

  /**
   * 销毁
   */
  destroy(): void {
    const canvas = this.renderer.getCanvas();
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('wheel', this.handleWheel);
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    window.removeEventListener('resize', this.handleResize);
  }

  /**
   * 获取所有图形
   */
  getShapes(): Shape[] {
    return this.scene.getShapes();
  }

  /**
   * 获取选择管理器
   */
  getSelectionManager(): SelectionManager {
    return this.selectionManager;
  }

  /**
   * 获取命令管理器
   */
  getCommandManager(): CommandManager {
    return this.commandManager;
  }

  /**
   * 获取选中的图形
   */
  getSelectedShapes(): Shape[] {
    return this.selectionManager.getSelection();
  }

  /**
   * 注册选择变化回调
   */
  onSelectionChange(callback: (shapes: Shape[]) => void): void {
    this.selectionChangeCallbacks.push(callback);
  }

  /**
   * 获取 Canvas 宽度
   */
  getWidth(): number {
    return this.canvasElement.clientWidth;
  }

  /**
   * 获取 Canvas 高度
   */
  getHeight(): number {
    return this.canvasElement.clientHeight;
  }
}
