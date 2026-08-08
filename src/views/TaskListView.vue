<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { taskApi } from '../api'
import type { Task } from '../api/types'
import CreateTestTaskDialog from '../components/CreateTestTaskDialog.vue'
import StatusTag from '../components/common/StatusTag.vue'
import { formatDate } from '../utils/format'

const router = useRouter()
const loading = ref(false)
const deletingId = ref<number>()
const createVisible = ref(false)
const tasks = ref<Task[]>([])

async function loadTasks() {
  loading.value = true
  try {
    tasks.value = await taskApi.list()
  } finally {
    loading.value = false
  }
}

async function deleteTask(task: Task) {
  try {
    await ElMessageBox.confirm(
      `将永久删除测试任务 #${task.id} 及其 Payload、执行结果和 Agent Trace，是否继续？`,
      '删除测试任务',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  deletingId.value = task.id
  try {
    await taskApi.delete(task.id)
    ElMessage.success(`测试任务 #${task.id} 已删除`)
    await loadTasks()
  } finally {
    deletingId.value = undefined
  }
}

onMounted(loadTasks)
</script>

<template>
  <div class="page-stack">
    <section class="page-actions">
      <div>
        <h1>测试任务</h1>
        <p>查看 SINGLE_TURN、AGENT、AUTO 和 DUAL 的执行状态与结果。</p>
      </div>
      <div class="button-group">
        <el-button @click="loadTasks">刷新</el-button>
        <el-button type="primary" @click="createVisible = true">
          新建测试
        </el-button>
      </div>
    </section>

    <section class="panel">
      <el-table v-loading="loading" :data="tasks" row-key="id">
        <el-table-column prop="id" label="ID" width="72" />
        <el-table-column label="任务" min-width="250">
          <template #default="{ row }">
            <button class="table-link" @click="router.push(`/tasks/${row.id}`)">
              {{ row.name }}
            </button>
            <div class="table-secondary">
              ReconResult #{{ row.reconResultId || '-' }} ·
              {{ row.selectedSurfaceIds?.length || 0 }} 个应用面
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="attackMode" label="攻击模式" width="130" />
        <el-table-column prop="scanMode" label="目标模式" width="130" />
        <el-table-column label="状态" width="120">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="结果" width="180">
          <template #default="{ row }">
            <span class="result-count success">{{ row.successCount }}</span>
            /
            <span class="result-count danger">{{ row.failCount }}</span>
            /
            <span class="result-count">{{ row.uncertainCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="150">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="primary" @click="router.push(`/tasks/${row.id}`)">
              查看
            </el-button>
            <el-button
              text
              type="danger"
              :disabled="row.status === 'PENDING' || row.status === 'RUNNING'"
              :loading="deletingId === row.id"
              @click="deleteTask(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="!loading && !tasks.length" description="暂无测试任务" />
    </section>

    <CreateTestTaskDialog v-model="createVisible" />
  </div>
</template>
