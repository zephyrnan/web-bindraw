/**
 * 文本图形
 */

import { Shape, type ShapeStyle } from './Shape';
import { Vector, AABB } from '../math';

export interface TextOptions {
  id?: string;
  name?: string;
  x?: number;
  y?: number;
  content?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: CanvasTextAlign;
  textBaseline?: CanvasTextBaseline;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  style?: ShapeStyle;
  maxWidth?: number;
}

export class Text extends Shape {
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  maxWidth?: number;

  private cachedWidth: number = 0;
  private cachedHeight: number = 0;

  constructor(options: TextOptions = {}) {
    super(options);
    this.name = options.name || 'Text';
    this.content = options.content ?? 'Text';
    this.fontSize = options.fontSize ?? 16;
    this.fontFamily = options.fontFamily ?? 'Arial, sans-serif';
    this.fontWeight = options.fontWeight ?? 'normal';
    this.textAlign = options.textAlign ?? 'center';
    this.textBaseline = options.textBaseline ?? 'middle';
    this.maxWidth = options.maxWidth;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.font = `${this.fontWeight} ${this.fontSize}px ${this.fontFamily}`;
    ctx.textAlign = this.textAlign;
    ctx.textBaseline = this.textBaseline;

    // 计算尺寸
    const metrics = ctx.measureText(this.content);
    this.cachedWidth = metrics.width;
    this.cachedHeight = this.fontSize * 1.2;

    if (this.style.fillStyle) {
      ctx.fillText(this.content, 0, 0, this.maxWidth);
    }

    if (this.style.strokeStyle) {
      ctx.strokeText(this.content, 0, 0, this.maxWidth);
    }
  }

  hitTest(worldPoint: Vector): boolean {
    const localPoint = this.worldToLocal(worldPoint);
    const halfW = this.cachedWidth / 2;
    const halfH = this.cachedHeight / 2;

    return localPoint.x >= -halfW && localPoint.x <= halfW &&
           localPoint.y >= -halfH && localPoint.y <= halfH;
  }

  getBoundingBox(): AABB {
    const halfW = (this.cachedWidth || 100) / 2;
    const halfH = (this.cachedHeight || this.fontSize) / 2;
    return new AABB(-halfW, -halfH, halfW, halfH);
  }

  setText(content: string): void {
    this.content = content;
  }

  setFont(fontSize: number, fontFamily?: string): void {
    this.fontSize = fontSize;
    if (fontFamily) {
      this.fontFamily = fontFamily;
    }
  }

  clone(): Text {
    return new Text({
      x: this.x,
      y: this.y,
      content: this.content,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: { ...this.style },
      maxWidth: this.maxWidth
    });
  }

  toJSON() {
    return {
      type: 'Text',
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      content: this.content,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      textAlign: this.textAlign,
      textBaseline: this.textBaseline,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      style: this.style,
      maxWidth: this.maxWidth,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex
    };
  }

  static fromJSON(json: unknown): Text {
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid Text JSON data');
    }
    const data = json as Record<string, unknown>;
    return new Text({
      id: typeof data.id === 'string' ? data.id : undefined,
      name: typeof data.name === 'string' ? data.name : undefined,
      x: typeof data.x === 'number' ? data.x : undefined,
      y: typeof data.y === 'number' ? data.y : undefined,
      content: typeof data.content === 'string' ? data.content : undefined,
      fontSize: typeof data.fontSize === 'number' ? data.fontSize : undefined,
      fontFamily: typeof data.fontFamily === 'string' ? data.fontFamily : undefined,
      fontWeight: typeof data.fontWeight === 'string' ? data.fontWeight : undefined,
      textAlign: typeof data.textAlign === 'string' ? data.textAlign as CanvasTextAlign : undefined,
      textBaseline: typeof data.textBaseline === 'string' ? data.textBaseline as CanvasTextBaseline : undefined,
      rotation: typeof data.rotation === 'number' ? data.rotation : undefined,
      scaleX: typeof data.scaleX === 'number' ? data.scaleX : undefined,
      scaleY: typeof data.scaleY === 'number' ? data.scaleY : undefined,
      style: data.style && typeof data.style === 'object' ? data.style as ShapeStyle : undefined,
      maxWidth: typeof data.maxWidth === 'number' ? data.maxWidth : undefined
    });
  }
}
