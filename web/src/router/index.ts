/**
 * 图形编辑器路由配置（简化版）
 */
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/editor'
  },
  {
    path: '/editor',
    name: 'GraphicEditor',
    component: () => import('../components/EditorExample.vue'),
    meta: {
      title: '图形编辑器'
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/editor'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 设置页面标题
router.beforeEach((to, _from, next) => {
  document.title = (to.meta.title as string) || '图形编辑器';
  next();
});

export default router;
