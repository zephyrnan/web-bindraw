import { describe, it, expect } from 'vitest';
import {
  validateShapeData,
  validateShapeWrapper,
  validateWebSocketMessage,
  safeJSONParse,
  sanitizeString,
} from '../validation';

describe('validation utils', () => {
  describe('validateShapeData', () => {
    it('should validate valid shape data', () => {
      const validShape = {
        type: 'Rect',
        id: 'shape-1',
        x: 100,
        y: 200,
        width: 50,
        height: 50,
      };

      expect(validateShapeData(validShape)).toBe(true);
    });

    it('should reject invalid shape data', () => {
      expect(validateShapeData(null)).toBe(false);
      expect(validateShapeData({})).toBe(false);
      expect(validateShapeData({ type: 'Rect' })).toBe(false);
      expect(validateShapeData({ type: 'Rect', id: 'shape-1' })).toBe(false);
    });
  });

  describe('validateShapeWrapper', () => {
    it('should validate valid shape wrapper', () => {
      const validWrapper = {
        id: 'wrapper-1',
        type: 'Rect',
        data: {
          type: 'Rect',
          id: 'shape-1',
          x: 100,
          y: 200,
        },
      };

      expect(validateShapeWrapper(validWrapper)).toBe(true);
    });

    it('should reject invalid shape wrapper', () => {
      expect(validateShapeWrapper(null)).toBe(false);
      expect(validateShapeWrapper({})).toBe(false);
      expect(validateShapeWrapper({ id: 'wrapper-1' })).toBe(false);
    });
  });

  describe('validateWebSocketMessage', () => {
    it('should validate valid WebSocket message', () => {
      const validMessage = {
        type: 'command',
        roomId: 'room-1',
        userId: 'user-1',
        timestamp: Date.now(),
        data: {},
      };

      expect(validateWebSocketMessage(validMessage)).toBe(true);
    });

    it('should reject invalid WebSocket message', () => {
      expect(validateWebSocketMessage(null)).toBe(false);
      expect(validateWebSocketMessage({})).toBe(false);
      expect(validateWebSocketMessage({ type: 'command' })).toBe(false);
    });
  });

  describe('safeJSONParse', () => {
    it('should parse valid JSON', () => {
      const json = '{"name":"test","value":123}';
      const result = safeJSONParse(json, {});

      expect(result).toEqual({ name: 'test', value: 123 });
    });

    it('should return fallback for invalid JSON', () => {
      const fallback = { error: true };
      const result = safeJSONParse('invalid json', fallback);

      expect(result).toBe(fallback);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize HTML special characters', () => {
      const input = '<script>alert("XSS")</script>';
      const output = sanitizeString(input);

      expect(output).not.toContain('<');
      expect(output).not.toContain('>');
      expect(output).toContain('&lt;');
      expect(output).toContain('&gt;');
    });

    it('should sanitize quotes', () => {
      const input = 'Hello "World" and \'Test\'';
      const output = sanitizeString(input);

      expect(output).toContain('&quot;');
      expect(output).toContain('&#x27;');
    });
  });
});
