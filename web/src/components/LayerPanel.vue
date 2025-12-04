<template>
  <div class="layer-panel">
    <div class="layer-header">
      <h3>图层</h3>
      <div class="layer-actions">
        <button @click="collapseAll" title="全部折叠">
          <i class="icon-collapse"></i>
        </button>
      </div>
    </div>

    <div class="layer-list">
      <div
        v-for="(shape, index) in sortedShapes"
        :key="shape.id"
        :class="['layer-item', {
          'selected': shape.selected,
          'locked': shape.locked,
          'hidden': !shape.visible
        }]"
        @click="selectShape(shape)"
        @dblclick="renameShape(shape)"
      >
        <div class="layer-content">
          <span class="layer-index">{{ sortedShapes.length - index }}</span>

          <div class="layer-info">
            <input
              v-if="editingShapeId === shape.id"
              v-model="editingName"
              @blur="finishRename(shape)"
              @keyup.enter="finishRename(shape)"
              @keyup.esc="cancelRename"
              class="layer-name-input"
              @click.stop
            />
            <span v-else class="layer-name">
              {{ shape.name || getShapeTypeName(shape) }}
            </span>
            <span class="layer-type">{{ getShapeTypeName(shape) }}</span>
          </div>

          <div class="layer-controls">
            <button
              @click.stop="toggleVisible(shape)"
              :title="shape.visible ? '隐藏' : '显示'"
              class="control-btn"
            >
              {{ shape.visible ? '👁️' : '🙈' }}
            </button>
            <button
              @click.stop="toggleLocked(shape)"
              :title="shape.locked ? '解锁' : '锁定'"
              class="control-btn"
            >
              {{ shape.locked ? '🔒' : '🔓' }}
            </button>
            <button
              @click.stop="deleteShape(shape)"
              title="删除"
              class="control-btn delete-btn"
            >
              🗑️
            </button>
          </div>
        </div>

        <div class="layer-order-controls">
          <button
            @click.stop="moveToTop(shape)"
            title="移至顶层"
            :disabled="index === 0"
            class="order-btn"
          >
            ⬆️
          </button>
          <button
            @click.stop="moveUp(shape)"
            title="上移一层"
            :disabled="index === 0"
            class="order-btn"
          >
            ▲
          </button>
          <button
            @click.stop="moveDown(shape)"
            title="下移一层"
            :disabled="index === sortedShapes.length - 1"
            class="order-btn"
          >
            ▼
          </button>
          <button
            @click.stop="moveToBottom(shape)"
            title="移至底层"
            :disabled="index === sortedShapes.length - 1"
            class="order-btn"
          >
            ⬇️
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Shape } from '@/core/shapes/Shape';
import type { Scene } from '@/core/Scene';

interface Props {
  scene: Scene;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  shapeSelected: [shape: Shape];
  shapeUpdated: [];
}>();

const editingShapeId = ref<string | null>(null);
const editingName = ref('');

// 按z-index排序的图形列表（从大到小）
const sortedShapes = computed(() => {
  const shapes = props.scene.getShapes();
  return [...shapes].sort((a, b) => b.zIndex - a.zIndex);
});

function getShapeTypeName(shape: Shape): string {
  const type = (shape as unknown as { type?: string }).type || shape.constructor.name;
  const typeMap: Record<string, string> = {
    'Rect': '矩形',
    'Circle': '圆形',
    'Line': '线条',
    'Text': '文本',
    'Group': '组合'
  };
  return typeMap[type] || type;
}

function selectShape(shape: Shape) {
  if (shape.locked) return;
  emit('shapeSelected', shape);
}

function renameShape(shape: Shape) {
  if (shape.locked) return;
  editingShapeId.value = shape.id;
  editingName.value = shape.name;
}

function finishRename(shape: Shape) {
  if (editingName.value.trim()) {
    shape.name = editingName.value.trim();
    emit('shapeUpdated');
  }
  editingShapeId.value = null;
}

function cancelRename() {
  editingShapeId.value = null;
}

function toggleVisible(shape: Shape) {
  shape.visible = !shape.visible;
  emit('shapeUpdated');
}

function toggleLocked(shape: Shape) {
  shape.locked = !shape.locked;
  emit('shapeUpdated');
}

function deleteShape(shape: Shape) {
  if (shape.locked) {
    alert('图形已锁定，无法删除');
    return;
  }
  if (confirm(`确定要删除 "${shape.name}" 吗？`)) {
    props.scene.remove(shape);
    emit('shapeUpdated');
  }
}

function moveToTop(shape: Shape) {
  const maxZ = Math.max(...sortedShapes.value.map(s => s.zIndex));
  shape.zIndex = maxZ + 1;
  emit('shapeUpdated');
}

function moveUp(shape: Shape) {
  const currentIndex = sortedShapes.value.findIndex(s => s.id === shape.id);
  if (currentIndex > 0) {
    const targetShape = sortedShapes.value[currentIndex - 1];
    const tempZ = shape.zIndex;
    shape.zIndex = targetShape.zIndex;
    targetShape.zIndex = tempZ;
    emit('shapeUpdated');
  }
}

function moveDown(shape: Shape) {
  const currentIndex = sortedShapes.value.findIndex(s => s.id === shape.id);
  if (currentIndex < sortedShapes.value.length - 1) {
    const targetShape = sortedShapes.value[currentIndex + 1];
    const tempZ = shape.zIndex;
    shape.zIndex = targetShape.zIndex;
    targetShape.zIndex = tempZ;
    emit('shapeUpdated');
  }
}

function moveToBottom(shape: Shape) {
  const minZ = Math.min(...sortedShapes.value.map(s => s.zIndex));
  shape.zIndex = minZ - 1;
  emit('shapeUpdated');
}

function collapseAll() {
  // 可以扩展：折叠/展开组合图形
  console.log('Collapse all groups');
}
</script>

<style scoped>
.layer-panel {
  width: 280px;
  height: 100%;
  background: #f8f9fa;
  border-left: 1px solid #dee2e6;
  display: flex;
  flex-direction: column;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.layer-header {
  padding: 16px;
  border-bottom: 1px solid #dee2e6;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
}

.layer-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #212529;
}

.layer-actions button {
  padding: 6px 10px;
  border: none;
  background: #e9ecef;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.layer-actions button:hover {
  background: #dee2e6;
}

.layer-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
}

.layer-item {
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 6px;
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.layer-item:hover {
  border-color: #0d6efd;
  box-shadow: 0 2px 8px rgba(13, 110, 253, 0.1);
}

.layer-item.selected {
  border-color: #0d6efd;
  background: #e7f1ff;
}

.layer-item.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.layer-item.hidden {
  opacity: 0.4;
}

.layer-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.layer-index {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #e9ecef;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 600;
  color: #495057;
  flex-shrink: 0;
}

.layer-info {
  flex: 1;
  min-width: 0;
}

.layer-name {
  display: block;
  font-weight: 500;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 14px;
}

.layer-type {
  display: block;
  font-size: 12px;
  color: #6c757d;
  margin-top: 2px;
}

.layer-name-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid #0d6efd;
  border-radius: 4px;
  font-size: 14px;
  outline: none;
}

.layer-controls {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.control-btn {
  padding: 4px 8px;
  border: none;
  background: #e9ecef;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.control-btn:hover {
  background: #dee2e6;
}

.delete-btn:hover {
  background: #dc3545;
  color: white;
}

.layer-order-controls {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #e9ecef;
}

.order-btn {
  flex: 1;
  padding: 4px;
  border: none;
  background: #f8f9fa;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: background 0.2s;
}

.order-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.order-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}
</style>
