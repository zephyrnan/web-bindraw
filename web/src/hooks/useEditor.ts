/**
 * Vue Composable for Editor
 * 将核心编辑器引擎与 Vue 组件集成
 *
 * 面试考点：
 * 1. 如何将纯 TS 类与 Vue 集成？—— Composables + ref/reactive
 * 2. 如何管理生命周期？—— onMounted/onUnmounted
 * 3. 如何实现响应式？—— 通过事件监听 + ref 更新
 */

import { ref, onMounted, onUnmounted, computed, type Ref } from 'vue';
import { Editor, type EditorOptions, type ToolType } from '@/core';
import { SelectTool } from '@/core/tools';
import Stats from 'stats.js';

export interface UseEditorOptions extends Omit<EditorOptions, 'canvas'> {
  /** Canvas ref */
  canvasRef: Ref<HTMLCanvasElement | null>;
  /** 初始工具 */
  initialTool?: ToolType;
}

export interface UseEditorReturn {
  /** 编辑器实例 */
  editor: Ref<Editor | null, Editor | null>;
  /** 当前工具 */
  currentTool: Ref<ToolType>;
  /** 切换工具 */
  setTool: (tool: ToolType) => void;
  /** 缩放级别 */
  zoom: Ref<number>;
  /** 设置缩放 */
  setZoom: (zoom: number) => void;
  /** FPS */
  fps: Ref<number>;
  /** 图形数量 */
  shapeCount: Ref<number>;
  /** 选中的图形 */
  selectedShapes: Ref<any[]>;
  /** 更新选中图形的样式 */
  updateSelectedStyle: (style: Partial<any>) => void;
  /** 删除选中的图形 */
  deleteSelected: () => void;
  /** 复制选中的图形 */
  duplicateSelected: () => void;
  /** 清空画布 */
  clear: () => void;
  /** 撤销 */
  undo: () => void;
  /** 重做 */
  redo: () => void;
  /** 导出 JSON */
  exportJSON: () => any;
  /** 导入 JSON */
  importJSON: (json: any) => void;
  /** 截图 */
  screenshot: (type?: 'png' | 'jpeg') => string;
  /** 下载截图 */
  downloadScreenshot: (filename?: string, type?: 'png' | 'jpeg') => void;
}

/**
 * 使用编辑器
 */
export function useEditor(options: UseEditorOptions) {
  const {
    canvasRef,
    initialTool = 'select',
    ...editorOptions
  } = options;

  const editor = ref<Editor | null>(null);
  const currentTool = ref<ToolType>(initialTool);
  const zoom = ref(1);
  const fps = ref(0);
  const shapeCount = ref(0);
  const selectedShapes = ref<any[]>([]);

  // Stats.js 实例
  let stats: Stats | null = null;

  // 更新统计信息
  let statsAnimationId: number | null = null;
  let lastStatsUpdate = 0;

  const updateStats = () => {
    const now = performance.now();
    if (now - lastStatsUpdate < 200) {
      statsAnimationId = requestAnimationFrame(updateStats);
      return;
    }
    
    lastStatsUpdate = now;
    
    if (!editor.value) {
      statsAnimationId = requestAnimationFrame(updateStats);
      return;
    }

    fps.value = editor.value.renderer.getFPS();
    shapeCount.value = editor.value.scene.count();
    zoom.value = editor.value.getZoom();

    // 更新选中的图形
    const selectTool = editor.value.toolManager.getTool('select') as SelectTool;
    if (selectTool) {
      selectedShapes.value = selectTool.getSelectedShapes();
    }
    
    statsAnimationId = requestAnimationFrame(updateStats);
  };

  // 切换工具
  const setTool = (tool: ToolType) => {
    if (!editor.value) return;

    editor.value.toolManager.setTool(tool);
    currentTool.value = tool;
  };

  // 设置缩放
  const setZoom = (newZoom: number) => {
    if (!editor.value) return;

    editor.value.setZoom(newZoom);
    zoom.value = newZoom;
  };

  // 清空画布
  const clear = () => {
    if (!editor.value) return;
    editor.value.clear();
    shapeCount.value = 0;
  };

  // 撤销
  const undo = () => {
    if (!editor.value) return;
    editor.value.commandManager.undo();
  };

  // 重做
  const redo = () => {
    if (!editor.value) return;
    editor.value.commandManager.redo();
  };

  // 导出 JSON
  const exportJSON = () => {
    if (!editor.value) return null;
    return editor.value.toJSON();
  };

  // 导入 JSON
  const importJSON = (json: any) => {
    if (!editor.value) return;
    editor.value.fromJSON(json);
    updateStats();
  };

  // 截图
  const screenshot = (type: 'png' | 'jpeg' = 'png') => {
    if (!editor.value) return '';
    return editor.value.renderer.screenshot(type);
  };

  // 下载截图
  const downloadScreenshot = (filename = 'canvas', type: 'png' | 'jpeg' = 'png') => {
    if (!editor.value) return;
    editor.value.renderer.downloadScreenshot(filename, type);
  };

  // 更新选中图形的样式
  const updateSelectedStyle = (style: Partial<any>) => {
    if (!editor.value || selectedShapes.value.length === 0) return;

    selectedShapes.value.forEach(shape => {
      Object.assign(shape.style, style);
    });

    editor.value.renderer.requestRender();
  };

  // 删除选中的图形
  const deleteSelected = () => {
    if (!editor.value || selectedShapes.value.length === 0) return;

    selectedShapes.value.forEach(shape => {
      editor.value!.scene.remove(shape);
    });

    selectedShapes.value = [];
    editor.value.renderer.requestRender();
  };

  // 复制选中的图形
  const duplicateSelected = () => {
    if (!editor.value || selectedShapes.value.length === 0) return;

    const clones: any[] = [];
    selectedShapes.value.forEach(shape => {
      const clone = shape.clone();
      clone.x += 20;
      clone.y += 20;
      editor.value!.scene.add(clone);
      clones.push(clone);
    });

    // 选中复制的图形
    const selectTool = editor.value.toolManager.getTool('select') as SelectTool;
    if (selectTool) {
      (selectTool as any).setSelection(clones);
      selectedShapes.value = clones;
    }

    editor.value.renderer.requestRender();
  };

  // 初始化编辑器
  onMounted(() => {
    const canvas = canvasRef.value;
    if (!canvas) {
      console.error('[useEditor] Canvas ref is null');
      return;
    }

    // 创建 Stats.js 实例
    stats = new Stats();
    stats.dom.style.position = 'fixed';
    stats.dom.style.top = '10px';
    stats.dom.style.right = '10px';
    stats.dom.style.left = 'auto';
    stats.dom.style.zIndex = '9999';
    document.body.appendChild(stats.dom);

    // 设置 Canvas 尺寸
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    // 创建编辑器
    editor.value = new Editor({
      canvas,
      ...editorOptions,
    });

    // 将 stats 实例传递给编辑器
    if (editor.value.renderer && stats) {
      (editor.value.renderer as any).stats = stats;
    }

    // 设置初始工具
    setTool(initialTool);

    // 启动统计更新
    statsAnimationId = requestAnimationFrame(updateStats);

    // 监听窗口大小变化
    const handleResize = () => {
      if (!canvas || !parent) return;

      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;

      if (editor.value) {
        editor.value.renderer.requestRender();
      }
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);

      if (statsAnimationId !== null) {
        cancelAnimationFrame(statsAnimationId);
        statsAnimationId = null;
      }

      // 清理 Stats.js
      if (stats && stats.dom.parentElement) {
        stats.dom.parentElement.removeChild(stats.dom);
      }
      stats = null;

      if (editor.value) {
        editor.value.destroy();
        editor.value = null;
      }
    });
  });

  return {
    editor,
    currentTool,
    setTool,
    zoom,
    setZoom,
    fps,
    shapeCount,
    selectedShapes,
    updateSelectedStyle,
    deleteSelected,
    duplicateSelected,
    clear,
    undo,
    redo,
    exportJSON,
    importJSON,
    screenshot,
    downloadScreenshot,
  };
}
