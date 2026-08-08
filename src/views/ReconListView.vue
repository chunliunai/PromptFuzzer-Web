<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { reconApi } from '../api'
import type { CreateReconTaskPayload, ReconTask } from '../api/types'
import StatusTag from '../components/common/StatusTag.vue'
import { formatDate } from '../utils/format'

const router = useRouter()
const loading = ref(false)
const creating = ref(false)
const deletingId = ref<number>()
const dialogVisible = ref(false)
const tasks = ref<ReconTask[]>([])
const form = reactive({
  name: '',
  scanMode: 'BROWSER' as 'BROWSER' | 'HTTP_TEMPLATE',
  reconContext: '',
  externalIntelligence: '',
  chatUrl: '',
  adapterMode: 'AUTO' as 'AUTO' | 'LLM_SECRANGE' | 'CUSTOM',
  inputSelector: '',
  submitSelector: '',
  responseSelector: '',
  assistantSelector: '',
  newChatSelector: '',
  targetType: 'default',
    manualLoginRequired: false,
  rawRequestTemplate: '',
})

async function loadTasks() {
  loading.value = true
  try {
    tasks.value = await reconApi.listTasks()
  } finally {
    loading.value = false
  }
}

async function createTask() {
  if (!form.name.trim()) return ElMessage.warning('请输入任务名称')
  if (form.scanMode === 'BROWSER' && !form.chatUrl.trim()) {
    return ElMessage.warning('请输入目标页面地址')
  }
  if (form.scanMode === 'HTTP_TEMPLATE' && !form.rawRequestTemplate.trim()) {
    return ElMessage.warning('请输入 HTTP 请求模板')
  }

  const payload: CreateReconTaskPayload = {
    name: form.name,
    scanMode: form.scanMode,
    reconContext: form.reconContext,
    externalIntelligence: form.externalIntelligence,
    reconConfig: {
      openDiscoveryEnabled: true,
      maxOpenDiscoveryMessages: 1,
      maxDiscoveryMessages: 4,
      maxGapFollowups: 3,
      maxCapabilityVerifications: 6,
      cleanBetweenVerifications: true,
    },
  }

  if (form.scanMode === 'BROWSER') {
    const localPreset = form.adapterMode === 'LLM_SECRANGE'
    const customSelectors =
      form.adapterMode === 'CUSTOM'
        ? {
            ...(form.inputSelector ? { input: form.inputSelector } : {}),
            ...(form.submitSelector ? { submit: form.submitSelector } : {}),
            ...(form.responseSelector
              ? { responseArea: form.responseSelector }
              : {}),
            ...(form.assistantSelector
              ? { assistantMessage: form.assistantSelector }
              : {}),
            ...(form.newChatSelector ? { newChat: form.newChatSelector } : {}),
          }
        : undefined
    payload.targetConfig = {
      chatUrl: form.chatUrl,
      targetType: localPreset
        ? 'llm-secrange-agent'
        : form.adapterMode === 'CUSTOM'
          ? form.targetType || 'custom-agent'
          : 'default',
      waitTimeoutMs: 45_000,
        login: form.manualLoginRequired ? { required: 'true' } : undefined,
      selectors: localPreset
        ? {
            input: '#msg',
            submit: '#send',
            responseArea: '#trans',
            assistantMessage: '#trans',
            newChat: '#reset',
          }
        : customSelectors,
    }
  } else {
    payload.rawRequestTemplate = form.rawRequestTemplate
  }

  creating.value = true
  try {
    const task = await reconApi.createTask(payload)
    ElMessage.success(`RECON #${task.id} 已创建`)
    dialogVisible.value = false
    await loadTasks()
    router.push(`/recon/${task.id}`)
  } finally {
    creating.value = false
  }
}

async function signalAuthReady() {
  await reconApi.signalAuthReady()
  ElMessage.success('已通知后端登录完成')
}

async function deleteTask(task: ReconTask) {
  try {
    await ElMessageBox.confirm(
      `将永久删除 RECON #${task.id} 及其 Trace、应用面和桥接产物，是否继续？`,
      '删除 RECON 任务',
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
    await reconApi.deleteTask(task.id)
    ElMessage.success(`RECON #${task.id} 已删除`)
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
        <h1>RECON 任务</h1>
        <p>先识别目标能力、证据和应用面，再进入桥接与测试阶段。</p>
      </div>
      <div class="button-group">
        <el-button @click="signalAuthReady">浏览器登录完成</el-button>
        <el-button type="primary" @click="dialogVisible = true">新建 RECON</el-button>
      </div>
    </section>

    <section class="panel">
      <el-table v-loading="loading" :data="tasks" row-key="id">
        <el-table-column prop="id" label="ID" width="74" />
        <el-table-column label="任务" min-width="260">
          <template #default="{ row }">
            <button class="table-link" @click="router.push(`/recon/${row.id}`)">
              {{ row.name }}
            </button>
            <div class="table-secondary">{{ row.reconContext || '未填写 RECON 上下文' }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="scanMode" label="模式" width="140" />
        <el-table-column label="状态" width="130">
          <template #default="{ row }"><StatusTag :status="row.status" /></template>
        </el-table-column>
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150">
          <template #default="{ row }">
            <el-button text type="primary" @click="router.push(`/recon/${row.id}`)">
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
      <el-empty v-if="!loading && !tasks.length" description="还没有 RECON 任务" />
    </section>

    <el-dialog v-model="dialogVisible" title="创建 RECON 任务" width="680px">
      <el-form label-position="top">
        <div class="form-grid">
          <el-form-item label="任务名称" required>
            <el-input v-model="form.name" placeholder="例如：本地银行 Agent 能力调查" />
          </el-form-item>
          <el-form-item label="探测模式">
            <el-segmented v-model="form.scanMode" :options="['BROWSER', 'HTTP_TEMPLATE']" />
          </el-form-item>
        </div>

        <template v-if="form.scanMode === 'BROWSER'">
          <el-form-item label="目标页面地址" required>
            <el-input v-model="form.chatUrl" placeholder="http://127.0.0.1:8000/agent/" />
          </el-form-item>
          <el-form-item label="页面适配方式">
            <el-radio-group v-model="form.adapterMode">
              <el-radio-button value="AUTO">自动识别（推荐）</el-radio-button>
              <el-radio-button value="LLM_SECRANGE">本地训练靶场</el-radio-button>
              <el-radio-button value="CUSTOM">自定义页面</el-radio-button>
            </el-radio-group>
            <div class="form-help">
              正常情况下选择自动识别即可。只有后端无法定位聊天输入框、发送按钮或回复区域时，才需要自定义 CSS 选择器。
            </div>
          </el-form-item>
            <el-form-item>
              <el-checkbox v-model="form.manualLoginRequired">
                目标页面首次使用时需要人工登录
              </el-checkbox>
              <div class="form-help">
                仅登录页勾选；免登录页面不要勾选，否则任务会等待“浏览器登录完成”信号。
              </div>
            </el-form-item>
          <div v-if="form.adapterMode === 'CUSTOM'" class="advanced-box">
            <div class="advanced-title">高级页面适配</div>
            <div class="form-grid">
              <el-form-item label="输入框选择器">
                <el-input v-model="form.inputSelector" placeholder="例如 textarea 或 #msg" />
              </el-form-item>
              <el-form-item label="发送按钮选择器">
                <el-input v-model="form.submitSelector" placeholder="例如 button[type=submit]" />
              </el-form-item>
              <el-form-item label="回复区域选择器">
                <el-input v-model="form.responseSelector" placeholder="例如 .message-list" />
              </el-form-item>
              <el-form-item label="单条回复选择器">
                <el-input v-model="form.assistantSelector" placeholder="例如 .assistant-message" />
              </el-form-item>
              <el-form-item label="新会话按钮选择器">
                <el-input v-model="form.newChatSelector" placeholder="例如 #reset" />
              </el-form-item>
              <el-form-item label="适配器名称">
                <el-input v-model="form.targetType" placeholder="用于区分登录态和页面配置" />
              </el-form-item>
            </div>
          </div>
        </template>
        <el-form-item v-else label="HTTP 请求模板" required>
          <el-input
            v-model="form.rawRequestTemplate"
            type="textarea"
            :rows="8"
            placeholder="粘贴完整 HTTP 请求模板"
          />
        </el-form-item>

        <el-form-item label="RECON 上下文">
          <el-input
            v-model="form.reconContext"
            type="textarea"
            :rows="3"
            placeholder="说明目标业务、授权范围或探测重点"
          />
        </el-form-item>
        <el-form-item label="外部情报">
          <el-input
            v-model="form.externalIntelligence"
            type="textarea"
            :rows="3"
            placeholder="可选：已知能力、历史结论或靶场说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="creating" @click="createTask">
          创建并开始
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
