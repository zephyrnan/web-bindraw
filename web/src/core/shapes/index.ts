/**
 * 图形模块导出
 */

export { Shape, type ShapeStyle } from './Shape';
export { Rect, type RectOptions } from './Rect';
export { Circle, type CircleOptions } from './Circle';
export { Line, type LineOptions } from './Line';
export { Text, type TextOptions } from './Text';
export { Group, type GroupOptions } from './Group';

import { Shape } from './Shape';
import { Rect } from './Rect';
import { Circle } from './Circle';
import { Line } from './Line';
import { Text } from './Text';
import { Group } from './Group';

/**
 * 图形工厂函数
 * 从JSON数据创建图形实例
 */
export function createShapeFromJSON(json: unknown): Shape {
  if (!json || typeof json !== 'object' || !('type' in json)) {
    throw new Error('Invalid shape data: missing type');
  }
  
  const shapeData = json as { type: string; [key: string]: unknown };
  
  switch (shapeData.type) {
    case 'Rect':
      return Rect.fromJSON(shapeData);
    case 'Circle':
      return Circle.fromJSON(shapeData);
    case 'Line':
      return Line.fromJSON(shapeData);
    case 'Text':
      return Text.fromJSON(shapeData);
    case 'Group':
      return Group.fromJSON(shapeData, createShapeFromJSON);
    default:
      throw new Error(`Unknown shape type: ${shapeData.type}`);
  }
}
