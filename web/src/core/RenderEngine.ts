/**
 * 渲染引擎
 * 负责高效渲染场景中的所有图形
 *
 * 面试考点：
 * 1. 为什么使用 requestAnimationFrame？—— 与浏览器刷新率同步，避免掉帧
 * 2. 如何优化渲染性能？—— 脏矩形、离屏渲染、跳帧检测、虚拟化渲染
 * 3. 如何处理高 DPI 屏幕？—— devicePixelRatio 缩放
 * 4. 性能监控？—— PerformanceMonitor 实时追踪 FPS、渲染时间
 */

import type { Scene } from './Scene';
import type { Editor } from './Editor';
import { AABB } from './math';
import type Stats from 'stats.js';

export interface RenderEngineOptions {
  /** 2D 渲染上下文 */
  ctx: CanvasRenderingContext2D;
  /** 场景 */
  scene: Scene;
  /** 编辑器实例 */
  editor: Editor;
  /** 是否开启脏矩形优化 */
  useDirtyRect?: boolean;
  /** 是否启用性能监控 */
  enablePerformanceMonitor?: boolean;
  /** 是否启用虚拟化渲染（只渲染可见区域） */
  useVirtualization?: boolean;
}

/**
 * 渲染引擎
 */
export class RenderEngine {
  private ctx: CanvasRenderingContext2D;
  private scene: Scene;
  private editor: Editor;
  private useDirtyRect: boolean;
  private useVirtualization: boolean;

  /** 性能指标 */
  private performanceMetrics = {
    fps: 0,
    frameTime: 0,
    renderTime: 0,
    shapeCount: 0,
    visibleShapeCount: 0,
  };

  /** Stats.js 实例（可选） */
  stats: Stats | null = null;

  /** 是否正在运行 */
  private running = false;

  /** requestAnimationFrame ID */
  private rafId: number | null = null;

  /** 是否需要重绘 */
  private needsRender = true;

  /** 上一帧时间戳 */
  private lastFrameTime = 0;

  /** FPS 统计 */
  private fps = 0;
  private frameCount = 0;
  private fpsUpdateTime = 0;

  constructor(options: RenderEngineOptions) {
    this.ctx = options.ctx;
    this.scene = options.scene;
    this.editor = options.editor;
    this.useDirtyRect = options.useDirtyRect ?? false;
    this.useVirtualization = options.useVirtualization ?? false;

    // 性能监控已移除，使用 Stats.js 代替
  }

  /**
   * 启动渲染循环
   */
  start(): void {
    if (this.running) return;

    this.running = true;
    this.lastFrameTime = performance.now();
    this.rafId = requestAnimationFrame(this.renderLoop);

    console.log('[RenderEngine] Started');
  }

  /**
   * 停止渲染循环
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }

    console.log('[RenderEngine] Stopped');
  }

  /**
   * 请求重绘
   */
  requestRender(): void {
    this.needsRender = true;
  }

  /**
   * 渲染循环
   */
  private renderLoop = (timestamp: number): void => {
    if (!this.running) return;

    // 计算帧时间
    const frameStartTime = performance.now();
    const deltaTime = timestamp - this.lastFrameTime;
    this.lastFrameTime = timestamp;

    // 更新 FPS
    this.updateFPS(timestamp, deltaTime);

    // 更新性能指标
    this.performanceMetrics.shapeCount = this.scene.count();
    this.performanceMetrics.fps = this.fps;

    // Stats.js 开始测量（只在实际渲染时）
    if (this.stats) {
      this.stats.begin();
    }

    // 持续渲染（取消脏标记优化，确保流畅交互）
    const renderStartTime = performance.now();
    this.render();
    const renderEndTime = performance.now();
    
    this.performanceMetrics.renderTime = renderEndTime - renderStartTime;
    this.performanceMetrics.frameTime = renderEndTime - frameStartTime;
    this.needsRender = false;

    // Stats.js 结束测量
    if (this.stats) {
      this.stats.end();
    }

    // 下一帧
    this.rafId = requestAnimationFrame(this.renderLoop);
  };

  /**
   * 更新 FPS 统计
   */
  private updateFPS(timestamp: number, deltaTime: number): void {
    this.frameCount++;

    if (timestamp - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = timestamp;
    }
  }

  /**
   * 渲染一帧
   */
  private render(): void {
    const canvas = this.ctx.canvas;

    // 保存当前状态
    this.ctx.save();

    // 1. 清空画布并渲染背景
    this.editor.renderBackground();

    // 2. 应用视图变换（缩放、平移）
    const viewMatrix = this.editor.getViewMatrix();
    this.ctx.transform(
      viewMatrix.a,
      viewMatrix.b,
      viewMatrix.c,
      viewMatrix.d,
      viewMatrix.e,
      viewMatrix.f
    );

    // 3. 渲染所有可见图形
    if (this.useVirtualization) {
      this.renderWithVirtualization();
    } else {
      this.renderAllShapes();
    }

    // 4. 渲染工具层（选择框、控制点等）
    this.ctx.restore();
    this.renderToolLayer();

    // 5. 渲染调试信息
    // 已禁用，使用 Stats.js 代替
    // if (import.meta.env.DEV) {
    //   this.renderDebugInfo();
    // }
  }

  /**
   * 渲染所有图形（常规模式）
   */
  private renderAllShapes(): void {
    this.scene.forEachVisible((shape) => {
      this.ctx.save();

      try {
        shape.render(this.ctx);
      } catch (error) {
        console.error('[RenderEngine] Render error:', error);
      }

      this.ctx.restore();
    });
  }

  /**
   * 虚拟化渲染（只渲染可见区域）
   * 面试考点：大量图形场景下的性能优化
   */
  private renderWithVirtualization(): void {
    const canvas = this.ctx.canvas;
    const zoom = this.editor.getZoom();

    // 计算可见区域（世界坐标）
    const viewportWorld = new AABB(
      -this.editor.getPan().x / zoom,
      -this.editor.getPan().y / zoom,
      (canvas.width - this.editor.getPan().x) / zoom,
      (canvas.height - this.editor.getPan().y) / zoom
    );

    // 查询可见区域内的图形
    const visibleShapes = this.scene.findInBounds(viewportWorld);

    // 更新可见图形数量
    this.performanceMetrics.visibleShapeCount = visibleShapes.length;

    // 只渲染可见图形
    visibleShapes.forEach((shape) => {
      if (!shape.visible) return;

      this.ctx.save();

      try {
        shape.render(this.ctx);
      } catch (error) {
        console.error('[RenderEngine] Render error:', error);
      }

      this.ctx.restore();
    });
  }

  /**
   * 渲染工具层
   * 不受视图变换影响的 UI 层（如选择框、控制点）
   */
  private renderToolLayer(): void {
    const currentTool = this.editor.toolManager.getCurrentTool();
    if (currentTool && typeof currentTool.render === 'function') {
      this.ctx.save();
      currentTool.render(this.ctx);
      this.ctx.restore();
    }
  }

  /**
   * 渲染调试信息
   * 注意：已禁用，使用 Stats.js 代替
   */
  private renderDebugInfo(): void {
    // 已禁用调试信息渲染，使用 Stats.js 显示 FPS
    // 如需调试，可以取消注释以下代码
    /*
    const canvas = this.ctx.canvas;
    const metrics = this.performanceMetrics;

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(10, 10, 250, 120);

    this.ctx.fillStyle = '#00ff00';
    this.ctx.font = '12px monospace';
    this.ctx.fillText(`FPS: ${metrics.fps}`, 20, 30);
    this.ctx.fillText(`Frame: ${metrics.frameTime.toFixed(2)}ms`, 20, 50);
    this.ctx.fillText(`Render: ${metrics.renderTime.toFixed(2)}ms`, 20, 70);
    this.ctx.fillText(`Shapes: ${metrics.shapeCount}`, 20, 90);

    if (this.useVirtualization) {
      this.ctx.fillText(`Visible: ${metrics.visibleShapeCount}`, 20, 110);
    }

    this.ctx.fillText(`Zoom: ${(this.editor.getZoom() * 100).toFixed(0)}%`, 20, 130);

    const quadTreeStats = this.scene.getQuadTreeStats();
    if (quadTreeStats) {
      this.ctx.fillText(`QuadTree Nodes: ${quadTreeStats.nodeCount}`, 20, 150);
    }

    this.ctx.restore();
    */
  }

  /**
   * 获取当前 FPS
   */
  getFPS(): number {
    return this.fps;
  }

  /**
   * 截图
   */
  screenshot(type: 'png' | 'jpeg' = 'png', quality = 1): string {
    return this.ctx.canvas.toDataURL(`image/${type}`, quality);
  }

  /**
   * 下载截图
   */
  downloadScreenshot(filename = 'canvas', type: 'png' | 'jpeg' = 'png'): void {
    const dataURL = this.screenshot(type);
    const link = document.createElement('a');
    link.download = `${filename}.${type}`;
    link.href = dataURL;
    link.click();
  }
}
