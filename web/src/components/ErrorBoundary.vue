<template>
  <div v-if="errorState.hasError" class="error-boundary">
    <div class="error-content">
      <h2>⚠️ 出错了</h2>
      <p class="error-message">{{ errorState.error?.message }}</p>
      <details v-if="showDetails">
        <summary>错误详情</summary>
        <pre>{{ errorState.error?.stack }}</pre>
      </details>
      <button @click="handleReload" class="reload-btn">
        重新加载
      </button>
    </div>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import { useErrorHandler } from '@/composables/useErrorHandler';

defineProps<{
  showDetails?: boolean;
}>();

const { errorState } = useErrorHandler('ErrorBoundary');

const handleReload = () => {
  window.location.reload();
};
</script>

<style scoped>
.error-boundary {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 2rem;
  background: #fff;
}

.error-content {
  max-width: 600px;
  text-align: center;
}

.error-content h2 {
  color: #dc2626;
  margin-bottom: 1rem;
}

.error-message {
  color: #374151;
  margin-bottom: 1.5rem;
  font-size: 1rem;
}

details {
  text-align: left;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f3f4f6;
  border-radius: 4px;
}

summary {
  cursor: pointer;
  font-weight: 500;
  color: #6b7280;
}

pre {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #dc2626;
  overflow-x: auto;
}

.reload-btn {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.reload-btn:hover {
  background: #2563eb;
}
</style>
