/**
 * 图形编辑器核心类
 *
 * 面试考点：
 * 1. 如何设计编辑器架构？—— 模块化：渲染、场景、工具、命令分离
 * 2. 如何处理坐标转换？—— 屏幕坐标 -> 世界坐标（矩阵逆变换）
 * 3. 如何优化性能？—— 脏矩形、requestAnimationFrame、离屏渲染
 */

import { Scene } from './Scene';
import { RenderEngine } from './RenderEngine';
import { ToolManager } from './tools/ToolManager';
import { CommandManager } from './commands/CommandManager';
import { AddShapeCommand, RemoveShapeCommand } from './commands';
import { Matrix, Vector } from './math';
import { ErrorHandler } from './ErrorHandler';
import { CONFIG } from './config';
import { createLogger } from '../utils/logger';
import type { Shape } from './shapes';

const logger = createLogger('Editor');

export interface EditorOptions {
  /** Canvas 元素 */
  canvas: HTMLCanvasElement;
  /** 背景颜色 */
  backgroundColor?: string;
  /** 是否开启网格 */
  showGrid?: boolean;
  /** 网格大小 */
  gridSize?: number;
}

/**
 * 编辑器核心类
 * 整合所有模块，提供统一的 API
 */
export class Editor {
  /** Canvas 元素 */
  readonly canvas: HTMLCanvasElement;

  /** 2D 渲染上下文 */
  readonly ctx: CanvasRenderingContext2D;

  /** 场景管理器 */
  readonly scene: Scene;

  /** 渲染引擎 */
  readonly renderer: RenderEngine;

  /** 工具管理器 */
  readonly toolManager: ToolManager;

  /** 命令管理器（撤销/重做） */
  readonly commandManager: CommandManager;

  /** 视图变换矩阵（用于缩放、平移） */
  private viewMatrix: Matrix;

  /** 视图逆矩阵（用于坐标转换） */
  private viewMatrixInverse: Matrix;

  /** 缩放级别 */
  private zoom = 1;

  /** 平移偏移 */
  private pan = new Vector(0, 0);

  /** 背景颜色 */
  private backgroundColor: string;

  /** 是否显示网格 */
  public showGrid: boolean;

  /** 网格大小 */
  private gridSize: number;

  /** 是否已销毁 */
  private destroyed = false;

  constructor(options: EditorOptions) {
    const {
      canvas,
      backgroundColor = '#ffffff',
      showGrid = true,
      gridSize = 20,
    } = options;

    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    this.backgroundColor = backgroundColor;
    this.showGrid = showGrid;
    this.gridSize = gridSize;

    // 初始化模块
    this.scene = new Scene({ autoSort: true });
    this.renderer = new RenderEngine({
      ctx: this.ctx,
      scene: this.scene,
      editor: this,
    });
    this.toolManager = new ToolManager(this);
    this.commandManager = new CommandManager();

    // 初始化视图矩阵
    this.viewMatrix = Matrix.identity();
    this.viewMatrixInverse = Matrix.identity();

    // 绑定事件
    this.bindEvents();

    // 监听场景变化，触发重绘
    this.scene.onChange(() => {
      this.renderer.requestRender();
    });

    // 启动渲染循环
    this.renderer.start();

    logger.info('Initialized');
  }

  /**
   * 绑定 DOM 事件
   */
  private bindEvents(): void {
    // 鼠标事件
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });

    // 触摸事件（移动端支持）
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('touchmove', this.handleTouchMove);
    this.canvas.addEventListener('touchend', this.handleTouchEnd);

    // 键盘事件
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  /**
   * 解绑 DOM 事件
   */
  private unbindEvents(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    this.canvas.removeEventListener('wheel', this.handleWheel);

    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.handleTouchEnd);

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  /**
   * 鼠标按下
   */
  private handleMouseDown = (e: MouseEvent): void => {
    const point = this.getMousePosition(e);
    this.toolManager.onMouseDown(point, e);
  };

  /**
   * 鼠标移动
   */
  private handleMouseMove = (e: MouseEvent): void => {
    const point = this.getMousePosition(e);
    this.toolManager.onMouseMove(point, e);
  };

  /**
   * 鼠标抬起
   */
  private handleMouseUp = (e: MouseEvent): void => {
    const point = this.getMousePosition(e);
    this.toolManager.onMouseUp(point, e);
  };

  /**
   * 鼠标滚轮（缩放）
   */
  private handleWheel = (e: WheelEvent): void => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const mousePos = this.getMousePosition(e);

    this.zoomAt(mousePos, delta);
  };

  /**
   * 触摸开始
   */
  private handleTouchStart = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      const point = this.getTouchPosition(e.touches[0]);
      this.toolManager.onMouseDown(point, e);
    }
  };

  /**
   * 触摸移动
   */
  private handleTouchMove = (e: TouchEvent): void => {
    if (e.touches.length === 1) {
      const point = this.getTouchPosition(e.touches[0]);
      this.toolManager.onMouseMove(point, e);
    }
  };

  /**
   * 触摸结束
   */
  private handleTouchEnd = (e: TouchEvent): void => {
    if (e.changedTouches.length === 1) {
      const point = this.getTouchPosition(e.changedTouches[0]);
      this.toolManager.onMouseUp(point, e);
    }
  };

  /**
   * 键盘按下
   */
  private handleKeyDown = (e: KeyboardEvent): void => {
    this.toolManager.onKeyDown(e);
  };

  /**
   * 键盘抬起
   */
  private handleKeyUp = (e: KeyboardEvent): void => {
    this.toolManager.onKeyUp(e);
  };

  /**
   * 获取鼠标在 Canvas 中的位置（世界坐标）
   */
  private getMousePosition(e: MouseEvent): Vector {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 屏幕坐标转世界坐标
    return this.screenToWorld(new Vector(x, y));
  }

  /**
   * 获取触摸点在 Canvas 中的位置（世界坐标）
   */
  private getTouchPosition(touch: Touch): Vector {
    const rect = this.canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    return this.screenToWorld(new Vector(x, y));
  }

  /**
   * 屏幕坐标转世界坐标
   */
  screenToWorld(screenPoint: Vector): Vector {
    return this.viewMatrixInverse.transformPoint(screenPoint);
  }

  /**
   * 世界坐标转屏幕坐标
   */
  worldToScreen(worldPoint: Vector): Vector {
    return this.viewMatrix.transformPoint(worldPoint);
  }

  /**
   * 在指定点缩放
   */
  zoomAt(point: Vector, scale: number): void {
    const newZoom = this.zoom * scale;

    // 限制缩放范围
    if (newZoom < CONFIG.canvas.minZoom || newZoom > CONFIG.canvas.maxZoom) return;

    // 计算新的平移量（保持鼠标点不动）
    const dx = point.x * (1 - scale);
    const dy = point.y * (1 - scale);

    this.zoom = newZoom;
    this.pan = this.pan.add(new Vector(dx, dy));

    this.updateViewMatrix();
    this.renderer.requestRender();
  }

  /**
   * 设置缩放级别
   */
  setZoom(zoom: number): void {
    this.zoom = Math.max(CONFIG.canvas.minZoom, Math.min(CONFIG.canvas.maxZoom, zoom));
    this.updateViewMatrix();
    this.renderer.requestRender();
  }

  /**
   * 设置平移
   */
  setPan(x: number, y: number): void {
    this.pan = new Vector(x, y);
    this.updateViewMatrix();
    this.renderer.requestRender();
  }

  /**
   * 更新视图矩阵
   */
  private updateViewMatrix(): void {
    // 先平移，再缩放
    this.viewMatrix = Matrix.identity()
      .translate(this.pan.x, this.pan.y)
      .scale(this.zoom, this.zoom);

    this.viewMatrixInverse = this.viewMatrix.invert();
  }

  /**
   * 获取视图变换矩阵
   */
  getViewMatrix(): Matrix {
    return this.viewMatrix;
  }

  /**
   * 获取缩放级别
   */
  getZoom(): number {
    return this.zoom;
  }

  /**
   * 获取平移偏移
   */
  getPan(): Vector {
    return this.pan;
  }

  /**
   * 添加图形（使用命令系统，支持撤销/重做）
   */
  addShape(shape: Shape): void {
    const command = new AddShapeCommand(shape, this.scene);
    this.commandManager.execute(command);
  }

  /**
   * 删除图形（使用命令系统，支持撤销/重做）
   */
  removeShape(shape: Shape): void {
    const command = new RemoveShapeCommand([shape], this.scene);
    this.commandManager.execute(command);
  }

  /**
   * 清空画布
   */
  clear(): void {
    this.scene.clear();
  }

  /**
   * 渲染背景和网格
   */
  renderBackground(): void {
    try {
      const { width, height } = this.canvas;

      // 清空画布
      this.ctx.fillStyle = this.backgroundColor;
      this.ctx.fillRect(0, 0, width, height);

      // 绘制网格
      if (this.showGrid) {
        this.renderGrid();
      }
    } catch (error) {
      ErrorHandler.getInstance().handleRenderError(error as Error);
    }
  }

  /**
   * 渲染网格
   */
  private renderGrid(): void {
    const { width, height } = this.canvas;
    const gridSize = this.gridSize * this.zoom;

    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 1;

    // 垂直线
    for (let x = (this.pan.x % gridSize); x < width; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    // 水平线
    for (let y = (this.pan.y % gridSize); y < height; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }
  }

  /**
   * 销毁编辑器
   */
  destroy(): void {
    if (this.destroyed) return;

    this.renderer.stop();
    this.unbindEvents();
    this.scene.clear();
    this.destroyed = true;

    logger.info('Destroyed');
  }

  /**
   * 导出为 JSON
   */
  toJSON(): EditorSnapshot {
    return {
      scene: this.scene.toJSON(),
      zoom: this.zoom,
      pan: { x: this.pan.x, y: this.pan.y },
    };
  }

  /**
   * 从 JSON 加载
   */
  fromJSON(json: EditorSnapshot): void {
    if (json.scene) {
      // TODO: 实现场景反序列化
    }
    if (json.zoom) {
      this.setZoom(json.zoom);
    }
    if (json.pan) {
      this.setPan(json.pan.x, json.pan.y);
    }
  }
}

/** 编辑器快照类型 */
export interface EditorSnapshot {
  scene: ReturnType<Scene['toJSON']>;
  zoom: number;
  pan: { x: number; y: number };
}
