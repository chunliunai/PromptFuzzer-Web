<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { browserApi, resourceApi, taskApi } from '../api'
import type {
  BrowserTargetConfig,
  BrowserTargetProfile,
  CreateTaskPayload,
} from '../api/types'
import { goalLabel, techniqueLabel } from '../utils/attackLabels'
import {
  agentDeskSelectors,
  agentDeskTargetType,
  configFromBrowserProfile,
} from '../utils/browserTargets'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const router = useRouter()
const loading = ref(false)
const resourcesLoaded = ref(false)
const goals = ref<string[]>([])
const techniques = ref<string[]>([])
const authProfile = ref<BrowserTargetProfile>()
const authLoading = ref(false)
const savedProfiles = ref<BrowserTargetProfile[]>([])

const form = reactive({
  name: '',
  attackMode: 'DUAL' as 'AGENT' | 'DUAL',
  scanMode: 'BROWSER' as 'BROWSER' | 'HTTP_TEMPLATE',
  goalIds: [] as string[],
  techniqueIds: [] as string[],
  attackContext: '',
  externalIntelligence: '',
  maxTurns: 8,
  retryCount: 1,
  generateCount: 1,
  chatUrl: '',
  adapterMode: 'AUTO' as
    | 'AUTO'
    | 'SAVED'
    | 'LLM_SECRANGE'
    | 'AGENTDESK'
    | 'CUSTOM',
  rawRequestTemplate: '',
  promptFieldPath: '',
  inputSelector: '',
  submitSelector: '',
  responseSelector: '',
  assistantSelector: '',
  newChatSelector: '',
  loginSuccessSelector: '',
  loginPageSelector: '',
  targetType: 'custom-agent',
  waitTimeoutMs: 60_000,
    manualLoginRequired: false,
})

const currentTargetType = computed(() => {
  if (form.adapterMode === 'LLM_SECRANGE') return 'llm-secrange-agent'
  if (form.adapterMode === 'AGENTDESK') {
    return agentDeskTargetType(form.chatUrl)
  }
  if (form.adapterMode === 'SAVED') return form.targetType
  if (form.adapterMode === 'CUSTOM') return form.targetType || 'custom-agent'
  return 'default'
})

const authStateType = computed(() => {
  if (!authProfile.value) return 'info'
  if (authProfile.value.authState === 'VERIFIED') return 'success'
  if (authProfile.value.authState === 'FAILED' || authProfile.value.authState === 'EXPIRED') return 'danger'
  if (authProfile.value.authState === 'VERIFYING') return 'warning'
  return 'info'
})

watch(
  () => props.modelValue,
  async (visible) => {
    if (!visible || resourcesLoaded.value) return
    ;[goals.value, techniques.value, savedProfiles.value] = await Promise.all([
      resourceApi.goals(),
      resourceApi.techniques(),
      browserApi
        .listTargets()
        .then((profiles) =>
          profiles.filter((profile) => profile.targetType !== 'default'),
        ),
    ])
    form.techniqueIds = ['tool_intent', 'role_play', 'misdirection'].filter((item) =>
      techniques.value.includes(item),
    )
    resourcesLoaded.value = true
  },
)

function close() {
  emit('update:modelValue', false)
}

function buildTargetConfig(): BrowserTargetConfig {
  if (form.adapterMode === 'SAVED') {
    const profile = savedProfiles.value.find(
      (item) => item.targetType === form.targetType,
    )
    if (profile) return configFromBrowserProfile(profile)
  }
  if (form.adapterMode === 'AGENTDESK') {
    return {
      chatUrl: form.chatUrl,
      targetType: currentTargetType.value,
      waitTimeoutMs: form.waitTimeoutMs,
      selectors: { ...agentDeskSelectors },
    }
  }

  if (form.adapterMode === 'LLM_SECRANGE') {
    return {
      chatUrl: form.chatUrl,
      targetType: currentTargetType.value,
      waitTimeoutMs: form.waitTimeoutMs,
        login: form.manualLoginRequired ? { required: 'true' } : undefined,
      loginCheck:
        form.manualLoginRequired &&
        (form.loginSuccessSelector || form.loginPageSelector)
          ? {
              ...(form.loginSuccessSelector ? { successSelector: form.loginSuccessSelector } : {}),
              ...(form.loginPageSelector ? { loginPageSelector: form.loginPageSelector } : {}),
            }
          : undefined,
      selectors: {
        input: '#msg',
        submit: '#send',
        responseArea: '#trans',
        assistantMessage: '#trans',
        newChat: '#reset',
      },
    }
  }

  if (form.adapterMode === 'CUSTOM') {
    const selectors = {
      ...(form.inputSelector ? { input: form.inputSelector } : {}),
      ...(form.submitSelector ? { submit: form.submitSelector } : {}),
      ...(form.responseSelector ? { responseArea: form.responseSelector } : {}),
      ...(form.assistantSelector
        ? { assistantMessage: form.assistantSelector }
        : {}),
      ...(form.newChatSelector ? { newChat: form.newChatSelector } : {}),
    }
    return {
      chatUrl: form.chatUrl,
      targetType: currentTargetType.value,
      waitTimeoutMs: form.waitTimeoutMs,
        login: form.manualLoginRequired ? { required: 'true' } : undefined,
      loginCheck:
        form.manualLoginRequired &&
        (form.loginSuccessSelector || form.loginPageSelector)
          ? {
              ...(form.loginSuccessSelector ? { successSelector: form.loginSuccessSelector } : {}),
              ...(form.loginPageSelector ? { loginPageSelector: form.loginPageSelector } : {}),
            }
          : undefined,
      selectors,
    }
  }

  return {
    chatUrl: form.chatUrl,
    targetType: currentTargetType.value,
    waitTimeoutMs: form.waitTimeoutMs,
      login: form.manualLoginRequired ? { required: 'true' } : undefined,
    loginCheck:
      form.manualLoginRequired &&
      (form.loginSuccessSelector || form.loginPageSelector)
        ? {
            ...(form.loginSuccessSelector ? { successSelector: form.loginSuccessSelector } : {}),
            ...(form.loginPageSelector ? { loginPageSelector: form.loginPageSelector } : {}),
          }
        : undefined,
  }
}

function applySavedProfile(targetType: string) {
  const profile = savedProfiles.value.find(
    (item) => item.targetType === targetType,
  )
  if (!profile) return
  const config = configFromBrowserProfile(profile)
  form.chatUrl = config.chatUrl
  form.waitTimeoutMs = config.waitTimeoutMs || 45_000
  form.manualLoginRequired = config.login?.required === 'true'
  form.loginSuccessSelector = config.loginCheck?.successSelector || ''
  form.loginPageSelector = config.loginCheck?.loginPageSelector || ''
  authProfile.value = profile
}

function targetProfilePayload() {
  return {
    targetType: currentTargetType.value,
    displayName: form.name || currentTargetType.value,
    targetConfig: buildTargetConfig(),
  }
}

async function refreshAuthProfile() {
  if (form.scanMode !== 'BROWSER' || !currentTargetType.value) return
  try {
    authProfile.value = await browserApi.getTarget(currentTargetType.value)
  } catch {
    authProfile.value = undefined
  }
}

async function saveBrowserTarget() {
  if (!form.chatUrl.trim()) return ElMessage.warning('请输入目标页面地址')
  authLoading.value = true
  try {
    authProfile.value = await browserApi.saveTarget(targetProfilePayload())
    ElMessage.success('目标配置已保存')
  } finally {
    authLoading.value = false
  }
}

async function startLogin() {
  if (!form.chatUrl.trim()) return ElMessage.warning('请输入目标页面地址')
  authLoading.value = true
  try {
    authProfile.value = await browserApi.startLogin(targetProfilePayload())
    ElMessage.success('登录浏览器已打开')
  } finally {
    authLoading.value = false
  }
}

async function authReady() {
  authLoading.value = true
  try {
    authProfile.value = await browserApi.signalAuthReady(currentTargetType.value)
    if (authProfile.value.authState === 'VERIFIED') {
      ElMessage.success('登录态验证通过')
    } else {
      ElMessage.warning(authProfile.value.lastFailureReason || '登录态验证未通过')
    }
  } finally {
    authLoading.value = false
  }
}

async function clearAuth() {
  authLoading.value = true
  try {
    authProfile.value = await browserApi.clearAuth(currentTargetType.value)
    ElMessage.success('登录态已清除')
  } finally {
    authLoading.value = false
  }
}

async function submit() {
  if (!form.name.trim()) return ElMessage.warning('请输入任务名称')
  if (!form.goalIds.length) return ElMessage.warning('至少选择一个 Goal')
  if (!form.techniqueIds.length) return ElMessage.warning('至少选择一个 Technique')
  if (!form.attackContext.trim()) return ElMessage.warning('请输入 AC 测试上下文')
  if (form.scanMode === 'BROWSER' && !form.chatUrl.trim()) {
    return ElMessage.warning('请输入目标页面地址')
  }
  if (
    form.scanMode === 'BROWSER' &&
    form.manualLoginRequired &&
    authProfile.value?.authState !== 'VERIFIED'
  ) {
    return ElMessage.warning('请先完成目标登录并通过验证')
  }
  if (form.scanMode === 'HTTP_TEMPLATE' && !form.rawRequestTemplate.trim()) {
    return ElMessage.warning('请输入 HTTP 请求模板')
  }

  const payload: CreateTaskPayload = {
    name: form.name.trim(),
    attackMode: form.attackMode,
    scanMode: form.scanMode,
    goalIds: form.goalIds,
    techniqueIds: form.techniqueIds,
    attackContext: form.attackContext,
    externalIntelligence: form.externalIntelligence,
    maxTurns: form.maxTurns,
    retryCount: form.retryCount,
    generateCount: form.generateCount,
    supplementalRecon: false,
  }
  if (form.scanMode === 'BROWSER') {
    payload.targetConfig = buildTargetConfig()
  } else {
    payload.rawRequestTemplate = form.rawRequestTemplate
    payload.promptFieldPath = form.promptFieldPath
  }

  loading.value = true
  try {
    const task = await taskApi.create(payload)
    ElMessage.success(`测试任务 #${task.id} 已创建`)
    close()
    router.push(`/tasks/${task.id}`)
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, form.adapterMode, form.targetType],
  () => {
    if (props.modelValue && form.scanMode === 'BROWSER') {
      refreshAuthProfile()
    }
  },
)
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    title="创建 AGENT / DUAL 测试"
    width="780px"
    destroy-on-close
    @close="close"
  >
    <el-form label-position="top">
      <div class="form-grid">
        <el-form-item label="任务名称" required>
          <el-input v-model="form.name" placeholder="例如：账户权限边界验证" />
        </el-form-item>
        <el-form-item label="执行模式">
          <el-segmented v-model="form.attackMode" :options="['DUAL', 'AGENT']" />
        </el-form-item>
      </div>

      <div class="form-grid">
        <el-form-item label="Goal" required>
          <el-select v-model="form.goalIds" multiple filterable placeholder="选择测试目标">
            <el-option
              v-for="goal in goals"
              :key="goal"
              :label="goalLabel(goal)"
              :value="goal"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="Technique" required>
          <el-select
            v-model="form.techniqueIds"
            multiple
            filterable
            collapse-tags
            placeholder="选择测试手法"
          >
            <el-option
              v-for="technique in techniques"
              :key="technique"
              :label="techniqueLabel(technique)"
              :value="technique"
            />
          </el-select>
        </el-form-item>
      </div>

      <el-form-item label="AC 测试上下文" required>
        <el-input
          v-model="form.attackContext"
          type="textarea"
          :rows="7"
          placeholder="描述授权测试目标、背景、任务、成功/失败标准和约束"
        />
      </el-form-item>

      <div class="form-grid three">
        <el-form-item label="最大轮数">
          <el-input-number v-model="form.maxTurns" :min="1" :max="30" />
        </el-form-item>
        <el-form-item label="重试次数">
          <el-input-number v-model="form.retryCount" :min="0" :max="5" />
        </el-form-item>
        <el-form-item label="每个 Goal 的 Agent 数">
          <el-input-number v-model="form.generateCount" :min="1" :max="10" />
        </el-form-item>
      </div>

      <el-form-item label="目标模式">
        <el-segmented
          v-model="form.scanMode"
          :options="['BROWSER', 'HTTP_TEMPLATE']"
        />
      </el-form-item>

      <template v-if="form.scanMode === 'BROWSER'">
        <el-form-item label="目标页面地址" required>
          <el-input v-model="form.chatUrl" placeholder="https://example.com/chat" />
        </el-form-item>
        <el-form-item label="页面适配方式">
          <el-radio-group v-model="form.adapterMode">
            <el-radio-button value="AUTO">自动识别（推荐）</el-radio-button>
            <el-radio-button value="SAVED">已保存目标</el-radio-button>
            <el-radio-button value="LLM_SECRANGE">本地训练靶场</el-radio-button>
            <el-radio-button value="AGENTDESK">AgentDesk</el-radio-button>
            <el-radio-button value="CUSTOM">自定义页面</el-radio-button>
          </el-radio-group>
          <div class="form-help">
            自动识别适用于常见聊天页面；只有系统找不到输入框、回复区域或新会话按钮时，才需要自定义 CSS 选择器。
          </div>
        </el-form-item>
        <el-form-item v-if="form.adapterMode === 'SAVED'" label="已保存目标">
          <el-select
            v-model="form.targetType"
            filterable
            placeholder="选择已验证的目标配置"
            @change="applySavedProfile"
          >
            <el-option
              v-for="profile in savedProfiles"
              :key="profile.targetType"
              :label="`${profile.displayName || profile.targetType} · ${profile.authState}`"
              :value="profile.targetType"
            />
          </el-select>
        </el-form-item>
          <el-form-item>
            <el-checkbox v-model="form.manualLoginRequired">
              目标页面首次使用时需要人工登录
            </el-checkbox>
            <div class="form-help">
              免登录页面不要勾选；勾选后必须先完成下方登录验证，任务才会发送 prompt。
            </div>
          </el-form-item>
        <div v-if="form.manualLoginRequired" class="auth-box">
          <div class="auth-row">
            <div>
              <div class="auth-title">目标登录态</div>
              <div class="form-help">
                targetType: {{ currentTargetType }}
                <span v-if="authProfile?.profilePath"> · {{ authProfile.profilePath }}</span>
              </div>
            </div>
            <el-tag :type="authStateType">
              {{ authProfile?.authState || 'UNKNOWN' }}
            </el-tag>
          </div>
          <div v-if="authProfile?.lastFailureReason" class="auth-error">
            {{ authProfile.lastFailureReason }}
          </div>
          <div v-if="authProfile?.lastVerifiedAt" class="form-help">
            最后验证：{{ authProfile.lastVerifiedAt }}
          </div>
          <div class="auth-actions">
            <el-button size="small" :loading="authLoading" @click="saveBrowserTarget">
              保存配置
            </el-button>
            <el-button size="small" type="primary" :loading="authLoading" @click="startLogin">
              开始登录
            </el-button>
            <el-button size="small" type="success" :loading="authLoading" @click="authReady">
              我已完成登录
            </el-button>
            <el-button size="small" type="danger" plain :loading="authLoading" @click="clearAuth">
              清除登录态
            </el-button>
          </div>
          <div class="form-grid auth-selectors">
            <el-form-item label="登录成功标识选择器">
              <el-input v-model="form.loginSuccessSelector" placeholder="例如 .chat-input 或 [data-testid=chat-input]" />
            </el-form-item>
            <el-form-item label="登录页标识选择器">
              <el-input v-model="form.loginPageSelector" placeholder="例如 input[type=password] 或 .login-form" />
            </el-form-item>
          </div>
        </div>

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

      <template v-else>
        <el-form-item label="HTTP 请求模板" required>
          <el-input v-model="form.rawRequestTemplate" type="textarea" :rows="8" />
        </el-form-item>
        <el-form-item label="Prompt 字段路径">
          <el-input v-model="form.promptFieldPath" placeholder="例如 body.messages[0].content" />
        </el-form-item>
      </template>

      <el-collapse>
        <el-collapse-item title="补充外部情报（可选）">
          <el-input
            v-model="form.externalIntelligence"
            type="textarea"
            :rows="4"
            placeholder="已知目标能力、历史测试结论或授权范围"
          />
        </el-collapse-item>
      </el-collapse>
    </el-form>

    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :loading="loading" @click="submit">
        创建并执行
      </el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.auth-box {
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  padding: 12px;
  margin: 0 0 16px;
  background: var(--el-fill-color-lighter);
}

.auth-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.auth-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.auth-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.auth-selectors {
  margin-top: 12px;
}

.auth-error {
  color: var(--el-color-danger);
  font-size: 12px;
  margin-top: 8px;
}
</style>
