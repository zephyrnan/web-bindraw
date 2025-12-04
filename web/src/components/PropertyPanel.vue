<template>
  <div v-if="selectedShapes.length > 0" class="property-panel">
    <div class="panel-header">
      <h3>属性面板</h3>
      <div class="selected-count">{{ selectedShapes.length }} 个图形</div>
    </div>

    <div class="panel-content">
      <!-- 填充颜色 -->
      <div class="property-group">
        <label class="property-label">填充颜色</label>
        <div class="color-picker">
          <input
            type="color"
            :value="fillColor || '#3498db'"
            @input="(e) => updateStyle('fillStyle', (e.target as HTMLInputElement).value)"
            :disabled="!hasFill"
          />
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="hasFill"
              @change="toggleFill"
            />
            启用
          </label>
        </div>
      </div>

      <!-- 描边颜色 -->
      <div class="property-group">
        <label class="property-label">描边颜色</label>
        <div class="color-picker">
          <input
            type="color"
            :value="strokeColor || '#2980b9'"
            @input="(e) => updateStyle('strokeStyle', (e.target as HTMLInputElement).value)"
            :disabled="!hasStroke"
          />
          <label class="checkbox-label">
            <input
              type="checkbox"
              :checked="hasStroke"
              @change="toggleStroke"
            />
            启用
          </label>
        </div>
      </div>

      <!-- 线宽 -->
      <div class="property-group">
        <label class="property-label">线宽</label>
        <div class="slider-control">
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            :value="lineWidth"
            @input="(e) => updateStyle('lineWidth', Number((e.target as HTMLInputElement).value))"
          />
          <span class="slider-value">{{ lineWidth }}px</span>
        </div>
      </div>

      <!-- 不透明度 -->
      <div class="property-group">
        <label class="property-label">不透明度</label>
        <div class="slider-control">
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            :value="opacity"
            @input="(e) => updateStyle('opacity', Number((e.target as HTMLInputElement).value))"
          />
          <span class="slider-value">{{ (opacity * 100).toFixed(0) }}%</span>
        </div>
      </div>

      <!-- 平滑选项（仅 Line 类型） -->
      <div v-if="hasLineShapes" class="property-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            :checked="isSmooth"
            @change="toggleSmooth"
          />
          平滑曲线
        </label>
      </div>

      <!-- 平滑算法（仅当启用平滑时） -->
      <div v-if="hasLineShapes && isSmooth" class="property-group">
        <label class="property-label">平滑算法</label>
        <select
          :value="smoothAlgorithm"
          @change="(e) => updateSmoothAlgorithm((e.target as HTMLSelectElement).value as any)"
          class="select-control"
        >
          <option value="catmullRom">Catmull-Rom 样条</option>
          <option value="bezier">贝塞尔曲线</option>
          <option value="simple">简单平滑</option>
        </select>
      </div>

      <!-- 操作按钮 -->
      <div class="property-actions">
        <button class="action-btn delete-btn" @click="deleteSelected">
          🗑️ 删除
        </button>
        <button class="action-btn duplicate-btn" @click="duplicateSelected">
          📋 复制
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Shape } from '@/core/shapes';
import type { Line } from '@/core/shapes';

const props = defineProps<{
  selectedShapes: any[];
  onStyleChange: (style: Partial<any>) => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
}>();

// 计算公共属性
const fillColor = computed(() => {
  if (props.selectedShapes.length === 0) return null;
  const color = props.selectedShapes[0].style.fillStyle;
  // 检查是否所有图形都有相同的填充色
  const allSame = props.selectedShapes.every(s => s.style.fillStyle === color);
  return allSame ? color : null;
});

const strokeColor = computed(() => {
  if (props.selectedShapes.length === 0) return null;
  const color = props.selectedShapes[0].style.strokeStyle;
  const allSame = props.selectedShapes.every(s => s.style.strokeStyle === color);
  return allSame ? color : null;
});

const lineWidth = computed(() => {
  if (props.selectedShapes.length === 0) return 2;
  const width = props.selectedShapes[0].style.lineWidth ?? 2;
  const allSame = props.selectedShapes.every(s => (s.style.lineWidth ?? 2) === width);
  return allSame ? width : 2;
});

const opacity = computed(() => {
  if (props.selectedShapes.length === 0) return 1;
  const op = props.selectedShapes[0].style.opacity ?? 1;
  const allSame = props.selectedShapes.every(s => (s.style.opacity ?? 1) === op);
  return allSame ? op : 1;
});

const hasFill = computed(() => {
  return props.selectedShapes.some(s => s.style.fillStyle !== null && s.style.fillStyle !== undefined);
});

const hasStroke = computed(() => {
  return props.selectedShapes.some(s => s.style.strokeStyle !== null && s.style.strokeStyle !== undefined);
});

const hasLineShapes = computed(() => {
  return props.selectedShapes.some(s => (s as any).smooth !== undefined);
});

const isSmooth = computed(() => {
  if (!hasLineShapes.value) return false;
  const lineShapes = props.selectedShapes.filter(s => (s as any).smooth !== undefined) as Line[];
  return lineShapes.length > 0 && lineShapes[0].smooth;
});

const smoothAlgorithm = computed(() => {
  if (!hasLineShapes.value) return 'catmullRom';
  const lineShapes = props.selectedShapes.filter(s => (s as any).smooth !== undefined) as Line[];
  return lineShapes.length > 0 ? lineShapes[0].smoothAlgorithm : 'catmullRom';
});

// 更新样式
function updateStyle(key: string, value: any) {
  props.onStyleChange({ [key]: value });
}

// 切换填充
function toggleFill() {
  if (hasFill.value) {
    updateStyle('fillStyle', null);
  } else {
    updateStyle('fillStyle', '#3498db');
  }
}

// 切换描边
function toggleStroke() {
  if (hasStroke.value) {
    updateStyle('strokeStyle', null);
  } else {
    updateStyle('strokeStyle', '#2980b9');
  }
}

// 切换平滑
function toggleSmooth() {
  const lineShapes = props.selectedShapes.filter(s => (s as any).smooth !== undefined) as Line[];
  lineShapes.forEach(line => {
    line.smooth = !line.smooth;
  });
}

// 更新平滑算法
function updateSmoothAlgorithm(algorithm: 'catmullRom' | 'bezier' | 'simple') {
  const lineShapes = props.selectedShapes.filter(s => (s as any).smooth !== undefined) as Line[];
  lineShapes.forEach(line => {
    line.smoothAlgorithm = algorithm;
  });
}

// 删除选中的图形
function deleteSelected() {
  props.onDeleteSelected();
}

// 复制选中的图形
function duplicateSelected() {
  props.onDuplicateSelected();
}
</script>

<style scoped>
.property-panel {
  position: absolute;
  top: 70px;
  right: 16px;
  width: 280px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 100;
  overflow: hidden;
}

.panel-header {
  padding: 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.selected-count {
  font-size: 12px;
  color: #666;
  background: #e3e8ef;
  padding: 4px 8px;
  border-radius: 4px;
}

.panel-content {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 500px;
  overflow-y: auto;
}

.property-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.property-label {
  font-size: 13px;
  font-weight: 500;
  color: #555;
}

.color-picker {
  display: flex;
  align-items: center;
  gap: 12px;
}

.color-picker input[type="color"] {
  width: 60px;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  cursor: pointer;
}

.color-picker input[type="color"]:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  user-select: none;
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
}

.slider-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.slider-control input[type="range"] {
  flex: 1;
  cursor: pointer;
}

.slider-value {
  min-width: 45px;
  text-align: right;
  font-size: 13px;
  font-weight: 500;
  color: #666;
}

.select-control {
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  background: white;
}

.property-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px solid #e0e0e0;
}

.action-btn {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn {
  background: #fee;
  color: #c33;
}

.delete-btn:hover {
  background: #fcc;
}

.duplicate-btn {
  background: #eff6ff;
  color: #3b82f6;
}

.duplicate-btn:hover {
  background: #dbeafe;
}
</style>
