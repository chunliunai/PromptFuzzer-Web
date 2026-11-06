<script setup lang="ts">
import {
  Compass,
  Connection,
  DataAnalysis,
  Grid,
  Monitor,
  Operation,
  Setting,
} from '@element-plus/icons-vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const menuItems = [
  { path: '/dashboard', label: '工作台', icon: Grid },
  { path: '/recon', label: 'RECON 任务', icon: Compass },
  { path: '/tasks', label: '测试任务', icon: Operation },
  { path: '/resources', label: '资源配置', icon: Setting },
  { path: '/mcp-inspector', label: 'MCP 调试', icon: Monitor },
]

function activeMenu() {
  if (route.path.startsWith('/recon-results/')) return '/recon'
  if (route.path.startsWith('/recon/')) return '/recon'
  if (route.path.startsWith('/tasks/')) return '/tasks'
  return route.path
}
</script>

<template>
  <el-container class="app-shell">
    <el-aside width="232px" class="app-sidebar">
      <button class="brand" type="button" @click="router.push('/dashboard')">
        <span class="brand-mark"><DataAnalysis /></span>
        <span>
          <strong>PromptFuzzer</strong>
          <small>Agent Security Lab</small>
        </span>
      </button>

      <el-menu :default-active="activeMenu()" router class="app-menu">
        <el-menu-item v-for="item in menuItems" :key="item.path" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </el-menu-item>
      </el-menu>

      <div class="pipeline-card">
        <div class="pipeline-title"><Connection /> 后端主链路</div>
        <div class="pipeline-step">RECON</div>
        <div class="pipeline-line" />
        <div class="pipeline-step pipeline-focus">AttackUnit</div>
        <div class="pipeline-line" />
        <div class="pipeline-step">AGENT / DUAL</div>
      </div>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div>
          <div class="page-title">{{ route.meta.title }}</div>
          <div class="page-subtitle">自动化 Agent 安全测试平台</div>
        </div>
        <el-tag effect="plain" type="success">API :9091</el-tag>
      </el-header>
      <el-main class="app-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>
