<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { taskApi } from '../api'
import type {
  AgentList,
  AgentSession,
  ReplayProfile,
  ScanResult,
  Task,
  WorkflowTrace,
} from '../api/types'
import JsonBlock from '../components/common/JsonBlock.vue'
import StatusTag from '../components/common/StatusTag.vue'
import { compactText, formatDate } from '../utils/format'

const route = useRoute()
const router = useRouter()
const taskId = Number(route.params.taskId)
const loading = ref(false)
const deleting = ref(false)
const task = ref<Task>()
const agents = ref<AgentList>()
const results = ref<ScanResult[]>([])
const replayProfiles = ref<ReplayProfile[]>([])
const activeAgent = ref<AgentSession>()
const traces = ref<WorkflowTrace[]>([])
const activeTab = ref('agents')

async function loadData() {
  loading.value = true
  try {
    const [taskData, agentData, resultData, replayProfileData] = await Promise.all([
      taskApi.get(taskId),
      taskApi.getAgents(taskId),
      taskApi.getResults(taskId),
      taskApi.getReplayProfiles(taskId),
    ])
    task.value = taskData
    agents.value = agentData
    results.value = resultData.items
    replayProfiles.value = replayProfileData
    if (agentData.agents.length && !activeAgent.value) {
      await selectAgent(agentData.agents[0].sessionIndex)
    }
  } finally {
    loading.value = false
  }
}

async function selectAgent(sessionIndex: number) {
  ;[activeAgent.value, traces.value] = await Promise.all([
    taskApi.getAgent(taskId, sessionIndex),
    taskApi.getAgentTraces(taskId, sessionIndex),
  ])
}

async function deleteTask() {
  try {
    await ElMessageBox.confirm(
      `将永久删除测试任务 #${taskId} 及其执行结果和 Workflow Trace，是否继续？`,
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

  deleting.value = true
  try {
    await taskApi.delete(taskId)
    ElMessage.success(`测试任务 #${taskId} 已删除`)
    router.push('/tasks')
  } finally {
    deleting.value = false
  }
}

function parseSnapshot(value?: string) {
  if (!value) return {}
  try {
    return JSON.parse(value) as Record<string, unknown>
  } catch {
    return {}
  }
}

function traceOutput(trace: WorkflowTrace) {
  return parseSnapshot(trace.outputSnapshot)
}

function traceField(trace: WorkflowTrace, field: string) {
  const value = traceOutput(trace)[field]
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function tagType(value?: string) {
  if (!value) return 'info'
  if (value === 'HTTP_REPLAY' || value === 'HTTP_REPLAYABLE') return 'success'
  if (value === 'BROWSER') return 'warning'
  if (value.includes('FAILED') || value.includes('EXPIRED') || value.includes('TIMEOUT')) return 'danger'
  return 'info'
}

function responseTimeText(row: ScanResult) {
  if (row.responseTime == null) return '未记录'
  if (row.responseTime === 0 && !row.responseBodyPreview) return '未记录'
  return `${row.responseTime}ms`
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <section class="page-actions">
      <div>
        <div class="breadcrumb-line">
          <el-button text @click="router.push('/tasks')">测试任务</el-button>
          <span>/</span>
          <span>#{{ taskId }}</span>
        </div>
        <h1>{{ task?.name || `Task #${taskId}` }}</h1>
        <p>
          {{ task?.attackMode || '-' }} · {{ task?.scanMode || '-' }} ·
            情报来源 {{ task?.reconResultId ? `ReconResult #${task.reconResultId}` : '-' }}
        </p>
      </div>
      <div class="button-group">
        <StatusTag :status="task?.status" />
        <el-button @click="loadData">刷新</el-button>
          <el-button
            type="danger"
            plain
            :disabled="task?.status === 'PENDING' || task?.status === 'RUNNING'"
            :loading="deleting"
            @click="deleteTask"
          >
            删除
          </el-button>
      </div>
    </section>

    <section class="metric-grid compact">
      <div class="metric-card">
        <span>Agent</span>
        <strong>{{ agents?.totalAgents ?? task?.agentCount ?? 0 }}</strong>
        <small>独立测试会话</small>
      </div>
      <div class="metric-card">
        <span>成功</span>
        <strong>{{ task?.successCount ?? 0 }}</strong>
        <small>已确认结果</small>
      </div>
      <div class="metric-card">
        <span>失败</span>
        <strong>{{ task?.failCount ?? 0 }}</strong>
        <small>未满足成功标准</small>
      </div>
      <div class="metric-card">
        <span>不确定</span>
        <strong>{{ task?.uncertainCount ?? 0 }}</strong>
        <small>需要人工复核</small>
      </div>
    </section>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="Agent 会话" name="agents">
          <div v-if="agents?.agents.length" class="agent-workspace">
            <aside class="agent-list">
              <button
                v-for="agent in agents.agents"
                :key="agent.id"
                type="button"
                :class="{ active: activeAgent?.sessionIndex === agent.sessionIndex }"
                @click="selectAgent(agent.sessionIndex)"
              >
                <span>
                  <strong>Agent {{ agent.sessionIndex }}</strong>
                  <small>{{ agent.goal }}</small>
                </span>
                <StatusTag :status="agent.status" />
              </button>
            </aside>

            <div v-if="activeAgent" class="agent-detail">
              <div class="panel-heading">
                <div>
                  <h2>Agent {{ activeAgent.sessionIndex }}</h2>
                  <p>{{ activeAgent.goal }} · Turn {{ activeAgent.currentTurn }}/{{ activeAgent.maxTurns }}</p>
                </div>
                <StatusTag :status="activeAgent.finalVerdict || activeAgent.status" />
              </div>

              <el-alert
                v-if="activeAgent.finalEvidence"
                title="最终证据"
                :description="activeAgent.finalEvidence"
                type="info"
                :closable="false"
              />

              <h3 class="section-title">对话轮次</h3>
              <el-timeline>
                <el-timeline-item
                  v-for="turn in activeAgent.turns"
                  :key="turn.turn"
                  :timestamp="`${turn.phase} · Turn ${turn.turn}`"
                  placement="top"
                >
                  <div class="trace-card">
                    <div class="trace-heading">
                      <strong>{{ turn.technique || turn.action || 'Agent Action' }}</strong>
                        <StatusTag v-if="turn.verdict" :status="turn.verdict" />
                        <el-tag v-else size="small" effect="plain">未判定</el-tag>
                    </div>
                      <strong>发送内容</strong>
                      <p>{{ compactText(turn.message, 300) }}</p>
                      <strong>目标回复</strong>
                      <p>
                        {{
                          turn.extractedText
                            ? compactText(turn.extractedText, 800)
                            : '未读取到目标回复'
                        }}
                      </p>
                      <small v-if="turn.evidence">
                        判定证据：{{ compactText(turn.evidence, 240) }}
                      </small>
                  </div>
                </el-timeline-item>
              </el-timeline>
              <el-empty v-if="!activeAgent.turns?.length" description="暂无对话轮次" />

              <h3 class="section-title">Workflow Trace</h3>
              <el-table :data="traces" size="small">
                <el-table-column prop="nodeName" label="节点" min-width="170" />
                <el-table-column prop="phase" label="阶段" width="100" />
                <el-table-column label="状态" width="110">
                  <template #default="{ row }"><StatusTag :status="row.status" /></template>
                </el-table-column>
                <el-table-column label="通道" width="130">
                  <template #default="{ row }">
                    <el-tag
                      v-if="traceField(row, 'executionChannel')"
                      size="small"
                      :type="tagType(traceField(row, 'executionChannel'))"
                      effect="plain"
                    >
                      {{ traceField(row, 'executionChannel') }}
                    </el-tag>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column label="Profile" width="100">
                  <template #default="{ row }">
                    {{ traceField(row, 'replayProfileId') || '-' }}
                  </template>
                </el-table-column>
                <el-table-column label="回退" min-width="180">
                  <template #default="{ row }">
                    <div v-if="traceField(row, 'fallbackType')" class="table-secondary">
                      <el-tag
                        size="small"
                        :type="tagType(traceField(row, 'fallbackType'))"
                        effect="plain"
                      >
                        {{ traceField(row, 'fallbackType') }}
                      </el-tag>
                      <div>{{ compactText(traceField(row, 'fallbackReason'), 120) }}</div>
                    </div>
                    <span v-else>-</span>
                  </template>
                </el-table-column>
                <el-table-column prop="verdict" label="判定" width="110" />
                <el-table-column label="耗时" width="100">
                  <template #default="{ row }">{{ row.durationMs ?? 0 }}ms</template>
                </el-table-column>
                <el-table-column label="时间" width="150">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
              </el-table>
            </div>
          </div>
          <el-empty v-else description="当前任务没有 Agent 会话" />
        </el-tab-pane>

        <el-tab-pane label="Scout 结果" name="results">
          <el-table :data="results">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="goal" label="Goal" width="180" />
            <el-table-column prop="technique" label="Technique" width="180" />
              <el-table-column label="通道" width="135">
                <template #default="{ row }">
                  <el-tag size="small" effect="plain">{{ row.executionChannel || 'UNKNOWN' }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column label="HTTP" width="90">
                <template #default="{ row }">{{ row.statusCode || '-' }}</template>
              </el-table-column>
              <el-table-column label="对话" width="80">
                <template #default="{ row }">{{ row.targetChatIndex ?? '-' }}</template>
              </el-table-column>
            <el-table-column label="Verdict" width="120">
              <template #default="{ row }"><StatusTag :status="row.verdict" /></template>
            </el-table-column>
            <el-table-column label="证据" min-width="260">
              <template #default="{ row }">{{ compactText(row.evidence, 180) }}</template>
            </el-table-column>
              <el-table-column label="目标响应" min-width="280">
                <template #default="{ row }">
                  <span v-if="row.responseBodyPreview">
                    {{ compactText(row.responseBodyPreview, 220) }}
                  </span>
                  <span v-else class="muted">未保存</span>
                </template>
              </el-table-column>
              <el-table-column label="Replay" width="100">
                <template #default="{ row }">
                  <span v-if="row.replayProfileId">#{{ row.replayProfileId }}</span>
                  <span v-else>-</span>
                </template>
              </el-table-column>
            <el-table-column label="响应时间" width="110">
                <template #default="{ row }">
                  <span :class="{ muted: responseTimeText(row) === '未记录' }">
                    {{ responseTimeText(row) }}
                  </span>
                </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!results.length" description="暂无 Scout 结果" />
        </el-tab-pane>

        <el-tab-pane label="HTTP Replay" name="replay">
          <el-table :data="replayProfiles">
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="状态" width="150">
              <template #default="{ row }">
                <el-tag size="small" :type="tagType(row.classification)" effect="plain">
                  {{ row.classification }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="目标会话" width="110">
              <template #default="{ row }">{{ row.targetChatIndex ?? '-' }}</template>
            </el-table-column>
            <el-table-column label="接口" min-width="280">
              <template #default="{ row }">
                <div class="table-main">{{ row.method || '-' }} {{ row.url || '-' }}</div>
                <div class="table-secondary">{{ row.endpointFingerprint || '-' }}</div>
              </template>
            </el-table-column>
            <el-table-column label="校验" width="120">
              <template #default="{ row }">
                {{ row.validationCount ?? 0 }} / {{ row.failureCount ?? 0 }}
              </template>
            </el-table-column>
            <el-table-column label="最近失败" min-width="220">
              <template #default="{ row }">
                {{ row.lastFailureReason ? compactText(row.lastFailureReason, 140) : '-' }}
              </template>
            </el-table-column>
            <el-table-column type="expand">
              <template #default="{ row }">
                <div class="raw-grid">
                  <div>
                    <h3>Dynamic Bindings</h3>
                    <JsonBlock :value="row.dynamicBindings" empty-text="暂无动态绑定" />
                  </div>
                  <div>
                    <h3>Request Template</h3>
                    <JsonBlock :value="row.requestTemplate" empty-text="暂无请求模板" />
                  </div>
                </div>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!replayProfiles.length" description="暂无 ReplayProfile" />
        </el-tab-pane>

        <el-tab-pane label="任务摘要" name="summary">
          <el-descriptions v-if="task" :column="2" border>
            <el-descriptions-item label="攻击模式">{{ task.attackMode }}</el-descriptions-item>
            <el-descriptions-item label="目标模式">{{ task.scanMode }}</el-descriptions-item>
            <el-descriptions-item label="情报来源">
              {{ task.reconResultId ? `ReconResult #${task.reconResultId}` : '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="应用面">
              {{ task.selectedSurfaceIds?.join(', ') || '-' }}
            </el-descriptions-item>
          </el-descriptions>
          <h3 class="section-title">报告摘要</h3>
          <JsonBlock :value="task?.reportSummary" empty-text="暂无报告摘要" />
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>
