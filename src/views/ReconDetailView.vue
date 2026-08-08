<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { reconApi } from '../api'
import type {
  ApplicationSurface,
  ReconResult,
  ReconTask,
  ReconTrace,
} from '../api/types'
import JsonBlock from '../components/common/JsonBlock.vue'
import StatusTag from '../components/common/StatusTag.vue'
import { compactText, formatDate, safeJson } from '../utils/format'

const route = useRoute()
const router = useRouter()
const taskId = Number(route.params.taskId)
const loading = ref(false)
const deletingTask = ref(false)
const deletingSurfaceId = ref<number>()
const task = ref<ReconTask>()
const result = ref<ReconResult>()
const traces = ref<ReconTrace[]>([])
const surfaces = ref<ApplicationSurface[]>([])
const activeTab = ref('surfaces')

const domainGroups = computed(() =>
  surfaces.value
    .filter((surface) => surface.surfaceLevel === 'DOMAIN')
    .map((domain) => ({
      domain,
      children: surfaces.value.filter(
        (surface) => surface.parentSurfaceId === domain.id,
      ),
    })),
)
const orphanCapabilities = computed(() =>
  surfaces.value.filter(
    (surface) =>
      surface.surfaceLevel === 'CAPABILITY' &&
      !surfaces.value.some((parent) => parent.id === surface.parentSurfaceId),
  ),
)

async function loadData() {
  loading.value = true
  try {
    task.value = await reconApi.getTask(taskId)
    traces.value = await reconApi.getTraces(taskId)
    if (task.value.status === 'COMPLETED') {
      result.value = await reconApi.getResult(taskId)
      surfaces.value = await reconApi.getSurfaces(result.value.id)
    }
  } finally {
    loading.value = false
  }
}

async function deleteTask() {
  try {
    await ElMessageBox.confirm(
      `将永久删除 RECON #${taskId} 及全部探测和桥接产物，是否继续？`,
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

  deletingTask.value = true
  try {
    await reconApi.deleteTask(taskId)
    ElMessage.success(`RECON #${taskId} 已删除`)
    router.push('/recon')
  } finally {
    deletingTask.value = false
  }
}

async function deleteSurface(surface: ApplicationSurface) {
  if (!result.value) return
  const description =
    surface.surfaceLevel === 'DOMAIN'
      ? `删除 DOMAIN「${surface.title}」会同时移除其 CAPABILITY 子节点，是否继续？`
      : `确认删除应用面「${surface.title}」？`
  try {
    await ElMessageBox.confirm(description, '删除应用面', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }

  deletingSurfaceId.value = surface.id
  try {
    await reconApi.deleteSurface(result.value.id, surface.id)
    ElMessage.success('应用面已删除')
    surfaces.value = await reconApi.getSurfaces(result.value.id)
  } finally {
    deletingSurfaceId.value = undefined
  }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <section class="page-actions">
      <div>
        <div class="breadcrumb-line">
          <el-button text @click="router.push('/recon')">RECON 任务</el-button>
          <span>/</span>
          <span>#{{ taskId }}</span>
        </div>
        <h1>{{ task?.name || `RECON #${taskId}` }}</h1>
        <p>{{ task?.reconContext || '查看探测过程、目标画像和应用面。' }}</p>
      </div>
      <div class="button-group">
        <StatusTag :status="task?.status" />
        <el-button @click="loadData">刷新</el-button>
          <el-button
            type="danger"
            plain
            :disabled="task?.status === 'PENDING' || task?.status === 'RUNNING'"
            :loading="deletingTask"
            @click="deleteTask"
          >
            删除
          </el-button>
        <el-button
          v-if="result"
          type="primary"
          @click="router.push(`/recon-results/${result.id}/bridge`)"
        >
          进入桥接工作台
        </el-button>
      </div>
    </section>

    <el-alert
      v-if="task?.status === 'RUNNING'"
      title="RECON 正在运行"
      description="可刷新查看最新 Trace；任务完成后会出现应用面和桥接入口。"
      type="warning"
      show-icon
      :closable="false"
    />
    <el-alert
      v-if="task?.status === 'FAILED'"
      :title="task.errorMessage || 'RECON 执行失败'"
      type="error"
      show-icon
      :closable="false"
    />

    <section class="metric-grid compact">
      <div class="metric-card">
        <span>Trace</span>
        <strong>{{ traces.length }}</strong>
        <small>探测与证据记录</small>
      </div>
      <div class="metric-card">
        <span>应用面</span>
        <strong>{{ surfaces.length }}</strong>
        <small>DOMAIN + CAPABILITY</small>
      </div>
      <div class="metric-card">
        <span>质量状态</span>
        <strong class="metric-text">{{ result?.qualityStatus || '-' }}</strong>
        <small>Java 质量门禁</small>
      </div>
      <div class="metric-card">
        <span>结果版本</span>
        <strong>{{ result?.version ?? '-' }}</strong>
        <small>{{ result ? `Result #${result.id}` : '等待生成' }}</small>
      </div>
    </section>

    <section class="panel">
      <el-tabs v-model="activeTab">
        <el-tab-pane label="应用面" name="surfaces">
          <el-empty
            v-if="!surfaces.length"
            description="任务完成后展示 DOMAIN / CAPABILITY"
          />
          <div v-else class="surface-list">
            <article v-for="group in domainGroups" :key="group.domain.id" class="surface-domain">
              <div class="surface-domain-heading">
                <div>
                  <span class="surface-id">#{{ group.domain.id }}</span>
                  <h3>{{ group.domain.title }}</h3>
                  <p>{{ group.domain.description }}</p>
                </div>
                  <div class="button-group">
                    <StatusTag :status="group.domain.verificationStatus" />
                    <el-button
                      text
                      type="danger"
                      :loading="deletingSurfaceId === group.domain.id"
                      @click="deleteSurface(group.domain)"
                    >
                      删除
                    </el-button>
                  </div>
              </div>
              <div class="capability-grid">
                <div
                  v-for="surface in group.children"
                  :key="surface.id"
                  class="capability-card"
                >
                  <div class="capability-title">
                    <span>#{{ surface.id }}</span>
                    <strong>{{ surface.title }}</strong>
                  </div>
                  <p>{{ compactText(surface.description, 180) }}</p>
                  <el-button
                    text
                    type="danger"
                    :loading="deletingSurfaceId === surface.id"
                    @click="deleteSurface(surface)"
                  >
                    删除
                  </el-button>
                  <div class="tag-row">
                    <StatusTag :status="surface.verificationStatus" />
                    <el-tag v-if="surface.evidenceSource" size="small" effect="plain">
                      {{ surface.evidenceSource }}
                    </el-tag>
                    <el-tag v-if="surface.relatedTool" size="small" effect="plain">
                      {{ surface.relatedTool }}
                    </el-tag>
                      <el-button
                        text
                        type="danger"
                        :loading="deletingSurfaceId === surface.id"
                        @click="deleteSurface(surface)"
                      >
                        删除
                      </el-button>
                  </div>
                </div>
              </div>
            </article>
            <div v-if="orphanCapabilities.length" class="capability-grid">
              <div
                v-for="surface in orphanCapabilities"
                :key="surface.id"
                class="capability-card"
              >
                <div class="capability-title">
                  <span>#{{ surface.id }}</span>
                  <strong>{{ surface.title }}</strong>
                </div>
                <p>{{ compactText(surface.description, 180) }}</p>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="目标画像" name="profile">
          <el-descriptions v-if="result" :column="2" border>
            <el-descriptions-item label="业务画像">
              {{ result.businessProfile || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="目标指纹">
              {{ result.targetFingerprint || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="响应特征">
              {{ result.responseProfile || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="未决问题">
              {{ result.unresolvedQuestions || '-' }}
            </el-descriptions-item>
          </el-descriptions>
          <el-empty v-else description="暂无目标画像" />
        </el-tab-pane>

        <el-tab-pane label="Trace" name="traces">
          <el-timeline>
            <el-timeline-item
              v-for="trace in traces"
              :key="trace.id"
              :timestamp="formatDate(trace.createdAt)"
              placement="top"
            >
              <div class="trace-card">
                <div class="trace-heading">
                  <strong>{{ trace.actionType }}</strong>
                  <StatusTag :status="trace.status" />
                </div>
                <p>{{ trace.observation || trace.errorMessage || '无观察结论' }}</p>
                <small>
                  Trace #{{ trace.id }} · {{ trace.evidenceType || 'NO_EVIDENCE' }} ·
                  {{ trace.durationMs ?? 0 }}ms
                </small>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-if="!traces.length" description="暂无 Trace" />
        </el-tab-pane>

        <el-tab-pane label="原始结果" name="raw">
          <div v-if="result" class="raw-grid">
            <div>
              <h3>开放发现</h3>
              <JsonBlock :value="safeJson(result.openDiscovery)" />
            </div>
            <div>
              <h3>覆盖计划</h3>
              <JsonBlock :value="safeJson(result.coveragePlan)" />
            </div>
            <div>
              <h3>能力事实</h3>
              <JsonBlock :value="safeJson(result.capabilityFacts)" />
            </div>
            <div>
              <h3>目标情报记忆</h3>
              <JsonBlock :value="safeJson(result.targetIntelligenceMemory)" />
            </div>
          </div>
          <el-empty v-else description="暂无原始结果" />
        </el-tab-pane>
      </el-tabs>
    </section>
  </div>
</template>
