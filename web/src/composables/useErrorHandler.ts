/**
 * Vue 错误处理 Composable
 * 统一处理组件中的错误
 */

import { ref, onErrorCaptured } from 'vue';
import { ErrorHandler } from '@/core/ErrorHandler';

export interface ErrorState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

export function useErrorHandler(context = 'Component') {
  const errorState = ref<ErrorState>({
    hasError: false,
    error: null,
    errorInfo: null,
  });

  const errorHandler = ErrorHandler.getInstance();

  /**
   * 捕获错误
   */
  onErrorCaptured((error: Error, instance, info) => {
    errorState.value = {
      hasError: true,
      error,
      errorInfo: info,
    };

    errorHandler.handle(error, context);

    // 阻止错误继续传播
    return false;
  });

  /**
   * 清除错误
   */
  const clearError = () => {
    errorState.value = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  };

  /**
   * 手动处理错误
   */
  const handleError = (error: Error) => {
    errorState.value = {
      hasError: true,
      error,
      errorInfo: error.message,
    };

    errorHandler.handle(error, context);
  };

  return {
    errorState,
    clearError,
    handleError,
  };
}
