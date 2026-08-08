<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { reconApi, taskApi } from '../api'
import type { ReconTask, Task } from '../api/types'
import CreateTestTaskDialog from '../components/CreateTestTaskDialog.vue'
import StatusTag from '../components/common/StatusTag.vue'
import { formatDate } from '../utils/format'

const router = useRouter()
const loading = ref(false)
const createTestVisible = ref(false)
const reconTasks = ref<ReconTask[]>([])
const tasks = ref<Task[]>([])

const runningCount = computed(
  () =>
    [...reconTasks.value, ...tasks.value].filter((item) => item.status === 'RUNNING').length,
)
const completedCount = computed(
  () =>
    [...reconTasks.value, ...tasks.value].filter((item) => item.status === 'COMPLETED').length,
)

async function loadData() {
  loading.value = true
  try {
    ;[reconTasks.value, tasks.value] = await Promise.all([
      reconApi.listTasks(),
      taskApi.list(),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <section class="hero-panel">
      <div>
        <div class="eyebrow">SECURITY TESTING WORKSPACE</div>
        <h1>从目标能力发现，到 Agent 自动化验证</h1>
        <p>围绕 RECON、AttackUnit 和 AGENT/DUAL 执行组织完整测试链路。</p>
      </div>
      <div class="button-group">
        <el-button size="large" @click="router.push('/recon')">发起 RECON</el-button>
        <el-button type="primary" size="large" @click="createTestVisible = true">
          创建 AGENT / DUAL
        </el-button>
      </div>
    </section>

    <section class="metric-grid">
      <div class="metric-card">
        <span>RECON 任务</span>
        <strong>{{ reconTasks.length }}</strong>
        <small>目标能力调查</small>
      </div>
      <div class="metric-card">
        <span>测试任务</span>
        <strong>{{ tasks.length }}</strong>
        <small>AGENT / DUAL 执行</small>
      </div>
      <div class="metric-card">
        <span>运行中</span>
        <strong>{{ runningCount }}</strong>
        <small>当前活跃任务</small>
      </div>
      <div class="metric-card">
        <span>已完成</span>
        <strong>{{ completedCount }}</strong>
        <small>累计闭环任务</small>
      </div>
    </section>

    <section class="content-grid two-columns">
      <div class="panel">
        <div class="panel-heading">
          <div>
            <h2>最近 RECON</h2>
            <p>查看目标画像与应用面</p>
          </div>
          <el-button text @click="router.push('/recon')">全部任务</el-button>
        </div>
        <el-empty v-if="!reconTasks.length" description="暂无 RECON 任务" />
        <button
          v-for="item in reconTasks.slice(0, 5)"
          :key="item.id"
          class="list-row"
          type="button"
          @click="router.push(`/recon/${item.id}`)"
        >
          <span class="list-main">
            <strong>{{ item.name }}</strong>
            <small>#{{ item.id }} · {{ item.scanMode }} · {{ formatDate(item.createdAt) }}</small>
          </span>
          <StatusTag :status="item.status" />
        </button>
      </div>

      <div class="panel">
        <div class="panel-heading">
          <div>
            <h2>最近测试</h2>
            <p>跟踪 Agent 执行状态</p>
          </div>
          <el-button text @click="router.push('/tasks')">全部任务</el-button>
        </div>
        <el-empty v-if="!tasks.length" description="暂无测试任务" />
        <button
          v-for="item in tasks.slice(0, 5)"
          :key="item.id"
          class="list-row"
          type="button"
          @click="router.push(`/tasks/${item.id}`)"
        >
          <span class="list-main">
            <strong>{{ item.name }}</strong>
            <small>#{{ item.id }} · {{ item.attackMode }} · {{ formatDate(item.createdAt) }}</small>
          </span>
          <StatusTag :status="item.status" />
        </button>
      </div>
    </section>

    <CreateTestTaskDialog v-model="createTestVisible" />
  </div>
</template>
