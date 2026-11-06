import { createRouter, createWebHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/DashboardView.vue'),
          meta: { title: '工作台' },
        },
        {
          path: 'recon',
          name: 'recon-list',
          component: () => import('../views/ReconListView.vue'),
          meta: { title: 'RECON 任务' },
        },
        {
          path: 'recon/:taskId',
          name: 'recon-detail',
          component: () => import('../views/ReconDetailView.vue'),
          meta: { title: 'RECON 详情' },
        },
        {
          path: 'recon-results/:resultId/bridge',
          name: 'bridge',
          component: () => import('../views/BridgeView.vue'),
          meta: { title: '桥接工作台' },
        },
        {
          path: 'tasks',
          name: 'task-list',
          component: () => import('../views/TaskListView.vue'),
          meta: { title: '测试任务' },
        },
        {
          path: 'tasks/:taskId',
          name: 'task-detail',
          component: () => import('../views/TaskDetailView.vue'),
          meta: { title: '任务详情' },
        },
        {
          path: 'resources',
          name: 'resources',
          component: () => import('../views/ResourcesView.vue'),
          meta: { title: '资源配置' },
        },
        {
          path: 'mcp-inspector',
          name: 'mcp-inspector',
          component: () => import('../views/McpInspectorView.vue'),
          meta: { title: 'MCP 调试' },
        },
      ],
    },
  ],
})

router.afterEach((to) => {
  document.title = `${String(to.meta.title ?? 'PromptFuzzer')} - PromptFuzzer`
})
