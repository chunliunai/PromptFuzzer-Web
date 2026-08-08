<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRoute, useRouter } from 'vue-router'
import { bridgeApi, reconApi, resourceApi } from '../api'
import type {
  ApplicationSurface,
  AttackCandidate,
  AttackUnit,
} from '../api/types'
import JsonBlock from '../components/common/JsonBlock.vue'
import StatusTag from '../components/common/StatusTag.vue'
import { goalLabel, techniqueLabel } from '../utils/attackLabels'
import { compactText } from '../utils/format'

const route = useRoute()
const router = useRouter()
const resultId = Number(route.params.resultId)
const loading = ref(false)
const generatingUnits = ref(false)
const generatingCandidates = ref(false)
const executingId = ref<number>()
const deletingUnitId = ref<number>()
const deletingCandidateId = ref<number>()
const savingCandidate = ref(false)
const editVisible = ref(false)
const surfaces = ref<ApplicationSurface[]>([])
const units = ref<AttackUnit[]>([])
const candidates = ref<AttackCandidate[]>([])
const goals = ref<string[]>([])
const techniques = ref<string[]>([])
const selectedSurfaceIds = ref<number[]>([])
const selectedUnitIds = ref<number[]>([])
const editForm = reactive({
  id: 0,
  title: '',
  description: '',
  recommendedGoal: '',
  attackMode: 'DUAL' as 'AGENT' | 'DUAL',
  attackContext: '',
  maxTurns: 8,
  retryCount: 1,
  generateCount: 3,
  techniqueIds: [] as string[],
})

const selectableSurfaces = computed(() =>
  surfaces.value.filter((surface) => surface.selectable),
)

async function loadData() {
  loading.value = true
  try {
    ;[
      surfaces.value,
      units.value,
      candidates.value,
      goals.value,
      techniques.value,
    ] = await Promise.all([
      reconApi.getSurfaces(resultId),
      bridgeApi.listUnits(resultId),
      bridgeApi.listCandidates(resultId),
      resourceApi.goals(),
      resourceApi.techniques(),
    ])
    if (!selectedSurfaceIds.value.length) {
      selectedSurfaceIds.value = selectableSurfaces.value.map((surface) => surface.id)
    }
    if (!selectedUnitIds.value.length) {
      selectedUnitIds.value = units.value.map((unit) => unit.id)
    }
  } finally {
    loading.value = false
  }
}

async function generateUnits() {
  if (!selectedSurfaceIds.value.length) {
    return ElMessage.warning('至少选择一个 CAPABILITY')
  }
  generatingUnits.value = true
  try {
    units.value = await bridgeApi.generateUnits(resultId, selectedSurfaceIds.value)
    selectedUnitIds.value = units.value.map((unit) => unit.id)
    ElMessage.success(`已生成 ${units.value.length} 个 AttackUnit`)
  } finally {
    generatingUnits.value = false
  }
}

async function generateCandidates() {
  if (!selectedUnitIds.value.length) {
    return ElMessage.warning('至少选择一个 AttackUnit')
  }
  generatingCandidates.value = true
  try {
    candidates.value = await bridgeApi.generateCandidates(resultId, selectedUnitIds.value)
    ElMessage.success(`已生成 ${candidates.value.length} 个候选请求包`)
  } finally {
    generatingCandidates.value = false
  }
}

async function executeCandidate(candidate: AttackCandidate) {
  executingId.value = candidate.id
  try {
    const task = await bridgeApi.executeCandidate(candidate.id)
    ElMessage.success(`测试任务 #${task.id} 已创建`)
    await loadData()
    router.push(`/tasks/${task.id}`)
  } finally {
    executingId.value = undefined
  }
}

async function deleteUnit(unit: AttackUnit) {
  try {
    await ElMessageBox.confirm(
      `删除 AttackUnit「${unit.title}」会同时删除其候选请求包，但不会删除已创建的测试任务，是否继续？`,
      '删除 AttackUnit',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  deletingUnitId.value = unit.id
  try {
    await bridgeApi.deleteUnit(unit.id)
    selectedUnitIds.value = selectedUnitIds.value.filter((id) => id !== unit.id)
    await loadData()
    ElMessage.success('AttackUnit 已删除')
  } finally {
    deletingUnitId.value = undefined
  }
}

async function deleteCandidate(candidate: AttackCandidate) {
  try {
    await ElMessageBox.confirm(
      `确认删除候选请求包「${candidate.title}」？已创建的测试任务不会被删除。`,
      '删除候选请求包',
      {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      },
    )
  } catch {
    return
  }

  deletingCandidateId.value = candidate.id
  try {
    await bridgeApi.deleteCandidate(candidate.id)
    candidates.value = candidates.value.filter((item) => item.id !== candidate.id)
    ElMessage.success('候选请求包已删除')
  } finally {
    deletingCandidateId.value = undefined
  }
}

function surfaceTitle(id: number) {
  return surfaces.value.find((surface) => surface.id === id)?.title ?? `Surface #${id}`
}

function openCandidateEditor(candidate: AttackCandidate) {
  const body = candidate.requestBody ?? {}
  editForm.id = candidate.id
  editForm.title = candidate.title
  editForm.description = candidate.description ?? ''
  editForm.recommendedGoal = candidate.recommendedGoal
  editForm.attackMode = String(
    body.attackMode ?? candidate.recommendedAttackMode ?? 'DUAL',
  ).toUpperCase() as 'AGENT' | 'DUAL'
  editForm.attackContext = candidate.attackContext ?? ''
  editForm.maxTurns = Number(body.maxTurns ?? 8)
  editForm.retryCount = Number(body.retryCount ?? 1)
  editForm.generateCount = Number(body.generateCount ?? 3)
  editForm.techniqueIds = Array.isArray(body.techniqueIds)
    ? body.techniqueIds.map(String)
    : []
  editVisible.value = true
}

async function saveCandidate() {
  const candidate = candidates.value.find((item) => item.id === editForm.id)
  if (!candidate) return
  if (!editForm.title.trim()) return ElMessage.warning('请输入候选标题')
  if (!editForm.recommendedGoal) return ElMessage.warning('请选择 Goal')
  if (!editForm.attackContext.trim()) return ElMessage.warning('请输入 AC')
  if (!editForm.techniqueIds.length) return ElMessage.warning('至少选择一个 Technique')

  const requestBody = {
    ...candidate.requestBody,
    name: `Candidate - ${editForm.title.trim()}`,
    attackMode: editForm.attackMode,
    maxTurns: editForm.maxTurns,
    retryCount: editForm.retryCount,
    generateCount: editForm.generateCount,
    attackContext: editForm.attackContext,
    goalIds: [editForm.recommendedGoal],
    techniqueIds: editForm.techniqueIds,
  }

  savingCandidate.value = true
  try {
    const updated = await bridgeApi.updateCandidate(candidate.id, {
      title: editForm.title,
      description: editForm.description,
      recommendedGoal: editForm.recommendedGoal,
      recommendedAttackMode: editForm.attackMode,
      attackContext: editForm.attackContext,
      requestBody: JSON.stringify(requestBody),
    })
    candidates.value = candidates.value.map((item) =>
      item.id === updated.id ? updated : item,
    )
    editVisible.value = false
    ElMessage.success('候选请求包已更新')
  } finally {
    savingCandidate.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <section class="page-actions">
      <div>
        <div class="breadcrumb-line">
          <el-button text @click="router.push('/recon')">RECON</el-button>
          <span>/</span>
          <span>Result #{{ resultId }}</span>
        </div>
        <h1>桥接工作台</h1>
        <p>将细粒度应用面聚合为 AttackUnit，再生成可审核、可执行的测试请求包。</p>
      </div>
      <el-button @click="loadData">刷新</el-button>
    </section>

    <section class="bridge-steps">
      <div class="bridge-step active"><span>1</span>选择应用面</div>
      <div class="bridge-connector" />
      <div class="bridge-step active"><span>2</span>聚合 AttackUnit</div>
      <div class="bridge-connector" />
      <div class="bridge-step active"><span>3</span>生成候选包</div>
      <div class="bridge-connector" />
      <div class="bridge-step"><span>4</span>执行测试</div>
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>可测试应用面</h2>
          <p>当前只选择 CAPABILITY 叶子，DOMAIN 由后端自动展开。</p>
        </div>
        <el-button
          type="primary"
          :loading="generatingUnits"
          @click="generateUnits"
        >
          生成 AttackUnit
        </el-button>
      </div>
      <el-checkbox-group v-model="selectedSurfaceIds" class="selection-grid">
        <el-checkbox
          v-for="surface in selectableSurfaces"
          :key="surface.id"
          :value="surface.id"
          border
        >
          <span class="selection-label">#{{ surface.id }} {{ surface.title }}</span>
        </el-checkbox>
      </el-checkbox-group>
      <el-empty v-if="!selectableSurfaces.length" description="暂无可选应用面" />
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>AttackUnit</h2>
          <p>按资源边界、安全控制和自然攻击链聚合。</p>
        </div>
        <el-button
          type="primary"
          :disabled="!units.length"
          :loading="generatingCandidates"
          @click="generateCandidates"
        >
          生成候选请求包
        </el-button>
      </div>
      <el-checkbox-group v-model="selectedUnitIds" class="unit-grid">
        <div v-for="unit in units" :key="unit.id" class="unit-card">
          <el-checkbox :value="unit.id" />
          <div class="unit-content">
            <div class="unit-heading">
              <div>
                <span class="surface-id">#{{ unit.id }} · {{ unit.unitKey }}</span>
                <h3>{{ unit.title }}</h3>
              </div>
              <div class="tag-row">
                <el-tag effect="plain">{{ unit.riskLevel || 'UNKNOWN' }}</el-tag>
                <el-tag effect="plain">{{ unit.confidence || 'UNKNOWN' }}</el-tag>
                  <el-button
                    text
                    type="danger"
                    :loading="deletingUnitId === unit.id"
                    @click="deleteUnit(unit)"
                  >
                    删除
                  </el-button>
              </div>
            </div>
            <p>{{ compactText(unit.description, 220) }}</p>
            <dl class="unit-facts">
              <div>
                <dt>资源边界</dt>
                <dd :title="unit.resourceBoundary">
                  {{ compactText(unit.resourceBoundary, 140) }}
                </dd>
              </div>
              <div>
                <dt>聚合原因</dt>
                <dd :title="unit.aggregationReason">
                  {{ compactText(unit.aggregationReason, 220) }}
                </dd>
              </div>
            </dl>
            <div class="surface-role">
              <strong>PRIMARY</strong>
              <span v-for="id in unit.primarySurfaceIds" :key="id">
                {{ surfaceTitle(id) }}
              </span>
            </div>
            <div v-if="unit.supportingSurfaceIds.length" class="surface-role muted">
              <strong>SUPPORTING</strong>
              <span v-for="id in unit.supportingSurfaceIds" :key="id">
                {{ surfaceTitle(id) }}
              </span>
            </div>
          </div>
        </div>
      </el-checkbox-group>
      <el-empty v-if="!units.length" description="选择应用面后生成 AttackUnit" />
    </section>

    <section class="panel">
      <div class="panel-heading">
        <div>
          <h2>候选请求包</h2>
          <p>确认 Goal、AC 和请求体后再执行为 AGENT/DUAL 任务。</p>
        </div>
      </div>
      <div class="candidate-list">
        <article v-for="candidate in candidates" :key="candidate.id" class="candidate-card">
          <div class="candidate-heading">
            <div>
              <span class="surface-id">Candidate #{{ candidate.id }}</span>
              <h3>{{ candidate.title }}</h3>
            </div>
            <div class="tag-row">
              <el-tag type="primary">{{ goalLabel(candidate.recommendedGoal) }}</el-tag>
              <el-tag effect="plain">{{ candidate.recommendedAttackMode }}</el-tag>
              <StatusTag :status="candidate.status" />
            </div>
          </div>
          <p>{{ candidate.description || candidate.rationale }}</p>
          <el-collapse>
            <el-collapse-item title="查看 AC 与请求参数">
              <h4>Attack Context</h4>
              <div class="context-block">{{ candidate.attackContext || '-' }}</div>
              <h4>Request Body</h4>
              <JsonBlock :value="candidate.requestBody" />
            </el-collapse-item>
          </el-collapse>
          <div class="candidate-actions">
            <span v-if="candidate.taskId">已创建 Task #{{ candidate.taskId }}</span>
              <el-button
                type="danger"
                plain
                :loading="deletingCandidateId === candidate.id"
                @click="deleteCandidate(candidate)"
              >
                删除
              </el-button>
            <el-button
              v-if="candidate.status !== 'EXECUTED'"
              @click="openCandidateEditor(candidate)"
            >
              编辑参数
            </el-button>
            <el-button
              v-if="candidate.status !== 'EXECUTED'"
              type="primary"
              :loading="executingId === candidate.id"
              @click="executeCandidate(candidate)"
            >
              确认并执行
            </el-button>
            <el-button
              v-else
              type="primary"
              plain
              @click="router.push(`/tasks/${candidate.taskId}`)"
            >
              查看任务
            </el-button>
          </div>
        </article>
      </div>
      <el-empty v-if="!candidates.length" description="选择 AttackUnit 后生成候选请求包" />
    </section>

    <el-dialog v-model="editVisible" title="编辑候选请求包" width="760px">
      <el-form label-position="top">
        <el-form-item label="候选标题" required>
          <el-input v-model="editForm.title" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="editForm.description" type="textarea" :rows="2" />
        </el-form-item>
        <div class="form-grid">
          <el-form-item label="Goal" required>
            <el-select v-model="editForm.recommendedGoal" filterable>
              <el-option
                v-for="goal in goals"
                :key="goal"
                :label="goalLabel(goal)"
                :value="goal"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="攻击模式">
            <el-segmented v-model="editForm.attackMode" :options="['DUAL', 'AGENT']" />
          </el-form-item>
        </div>
        <el-form-item label="AC 测试上下文" required>
          <el-input
            v-model="editForm.attackContext"
            type="textarea"
            :rows="9"
          />
        </el-form-item>
        <div class="form-grid three">
          <el-form-item label="最大轮数">
            <el-input-number v-model="editForm.maxTurns" :min="1" :max="30" />
          </el-form-item>
          <el-form-item label="重试次数">
            <el-input-number v-model="editForm.retryCount" :min="0" :max="5" />
          </el-form-item>
          <el-form-item label="生成数量">
            <el-input-number v-model="editForm.generateCount" :min="1" :max="10" />
          </el-form-item>
        </div>
        <el-form-item label="Techniques" required>
          <el-select
            v-model="editForm.techniqueIds"
            multiple
            filterable
            collapse-tags
          >
            <el-option
              v-for="technique in techniques"
              :key="technique"
              :label="techniqueLabel(technique)"
              :value="technique"
            />
          </el-select>
        </el-form-item>
        <el-alert
          title="保存后会同步更新候选展示字段与最终执行 requestBody"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="savingCandidate" @click="saveCandidate">
          保存修改
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>
