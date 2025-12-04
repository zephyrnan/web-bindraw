/**
 * 文件导入导出工具
 * 支持JSON、SVG、PNG格式
 */

import type { Editor } from '@/core/Editor';
import type { Scene } from '@/core/Scene';

/** 导出选项 */
export interface ExportOptions {
  /** 文件名（不含扩展名） */
  filename?: string;
  /** 是否美化JSON */
  prettify?: boolean;
  /** PNG导出质量 (0-1) */
  quality?: number;
  /** 导出背景色 */
  backgroundColor?: string;
}

/**
 * 导出为JSON
 */
export function exportToJSON(editor: Editor, options: ExportOptions = {}): void {
  const {
    filename = 'canvas',
    prettify = true
  } = options;

  const data = editor.toJSON();
  const json = prettify ? JSON.stringify(data, null, 2) : JSON.stringify(data);

  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, `${filename}.json`);
}

/**
 * 导出为PNG
 */
export async function exportToPNG(editor: Editor, options: ExportOptions = {}): Promise<void> {
  const {
    filename = 'canvas',
    quality = 0.92,
    backgroundColor = '#ffffff'
  } = options;

  // 获取canvas（通过ctx）
  const ctx = (editor.renderer as unknown as { ctx: CanvasRenderingContext2D }).ctx;
  const canvas = ctx.canvas;

  // 创建临时canvas添加背景色
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;
  const tempCtx = tempCanvas.getContext('2d')!;

  // 填充背景色
  tempCtx.fillStyle = backgroundColor;
  tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

  // 绘制原canvas内容
  tempCtx.drawImage(canvas, 0, 0);

  // 转换为blob
  const blob = await new Promise<Blob>((resolve) => {
    tempCanvas.toBlob(
      (blob) => resolve(blob!),
      'image/png',
      quality
    );
  });

  downloadBlob(blob, `${filename}.png`);
}

/**
 * 导出为SVG
 */
export function exportToSVG(scene: Scene, options: ExportOptions = {}): void {
  const {
    filename = 'canvas',
    backgroundColor = 'white'
  } = options;

  const shapes = scene.getShapes();

  // 计算边界
  const bounds = calculateBounds(shapes);
  if (!bounds) {
    alert('没有可导出的图形');
    return;
  }

  const { minX, minY, width, height } = bounds;

  // 生成SVG
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}">`;

  // 添加背景
  if (backgroundColor && backgroundColor !== 'transparent') {
    svg += `\n  <rect x="${minX}" y="${minY}" width="${width}" height="${height}" fill="${backgroundColor}"/>`;
  }

  // 转换每个图形
  for (const shape of shapes) {
    if (!shape.visible) continue;
    svg += '\n  ' + shapeToSVG(shape);
  }

  svg += '\n</svg>';

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  downloadBlob(blob, `${filename}.svg`);
}

/**
 * 从JSON导入
 */
export async function importFromJSON(editor: Editor, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        editor.fromJSON(json);
        resolve();
      } catch (error) {
        reject(new Error('JSON解析失败: ' + (error as Error).message));
      }
    };

    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

/**
 * 从JSON字符串导入
 */
export function importFromJSONString(editor: Editor, jsonString: string): void {
  try {
    const json = JSON.parse(jsonString);
    editor.fromJSON(json);
  } catch (error) {
    throw new Error('JSON解析失败: ' + (error as Error).message);
  }
}

// ========== 辅助函数 ==========

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

function calculateBounds(shapes: unknown[]): Bounds | null {
  if (shapes.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const shape of shapes) {
    // 类型安全的属性访问
    const s = shape as { x?: number; y?: number; width?: number; height?: number; radius?: number };

    if (typeof s.x === 'number' && typeof s.y === 'number') {
      const x = s.x;
      const y = s.y;
      const w = s.width || s.radius || 0;
      const h = s.height || s.radius || 0;

      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }
  }

  const padding = 20;
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  };
}

function shapeToSVG(shape: unknown): string {
  const s = shape as {
    type?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    radius?: number;
    cornerRadius?: number;
    style?: {
      fillStyle?: string | null;
      strokeStyle?: string | null;
      lineWidth?: number;
      opacity?: number;
    };
    points?: Array<{ x: number; y: number }>;
    content?: string;
    fontSize?: number;
  };

  const style = s.style || {};
  const fill = style.fillStyle || 'none';
  const stroke = style.strokeStyle || 'black';
  const strokeWidth = style.lineWidth || 1;
  const opacity = style.opacity !== undefined ? style.opacity : 1;
  const styleAttr = `fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"`;

  switch (s.type) {
    case 'Rect':
      return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.cornerRadius || 0}" ${styleAttr}/>`;

    case 'Circle':
      return `<circle cx="${s.x}" cy="${s.y}" r="${s.radius}" ${styleAttr}/>`;

    case 'Line':
      if (s.points && s.points.length > 0) {
        const pathData = s.points.map((p, i) =>
          `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
        ).join(' ');
        return `<path d="${pathData}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
      }
      return '';

    case 'Text':
      return `<text x="${s.x}" y="${s.y}" font-size="${s.fontSize || 16}" ${styleAttr}>${escapeXML(s.content || '')}</text>`;

    default:
      return `<!-- Unsupported shape: ${s.type} -->`;
  }
}

function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 触发文件选择对话框
 */
export function selectFile(accept: string): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;

    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}
