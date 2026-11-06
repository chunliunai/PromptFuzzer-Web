<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { mcpInspectorApi } from '../api'
import type { McpInspectorRunResult, McpInspectorSession } from '../api/types'

const form = reactive({
  variant: 'vulnerable' as 'vulnerable' | 'fixed',
  transport: 'http' as 'http' | 'sse',
  serverUrl: 'http://127.0.0.1:8787/mcp',
})

const session = ref<McpInspectorSession>({ running: false })
const runResult = ref<McpInspectorRunResult | null>(null)
const loading = reactive({ start: false, stop: false, run: false })
let pollTimer: number | undefined

async function refresh() {
  session.value = await mcpInspectorApi.status()
}

async function start() {
  loading.start = true
  try {
    session.value = await mcpInspectorApi.start({ ...form })
    ElMessage.success('MCP Inspector 已启动')
  } finally {
    loading.start = false
  }
}

async function stop() {
  loading.stop = true
  try {
    session.value = await mcpInspectorApi.stop()
    ElMessage.success('已停止')
  } finally {
    loading.stop = false
  }
}

function openInspector() {
  if (session.value.uiUrl) {
    window.open(session.value.uiUrl, '_blank', 'noopener')
  }
}

async function runOnce() {
  loading.run = true
  try {
    runResult.value = await mcpInspectorApi.run({ ...form })
    ElMessage.success(
      runResult.value.timedOut
        ? '验证已执行（等待超时属预期，漏洞在超时前已触发）'
        : '验证执行完成',
    )
  } catch (e: unknown) {
    ElMessage.error(e instanceof Error ? e.message : '验证执行失败')
  } finally {
    loading.run = false
  }
}

onMounted(() => {
  refresh().catch(() => undefined)
  pollTimer = window.setInterval(() => {
    if (session.value.running) refresh().catch(() => undefined)
  }, 4000)
})

onBeforeUnmount(() => {
  if (pollTimer) window.clearInterval(pollTimer)
})
</script>

<template>
  <div class="mcp-inspector-view">
    <el-alert
      type="warning"
      :closable="false"
      show-icon
      title="CVE-2026-119025 本地授权实验台"
      description="本页面用于在本地启动官方 MCP Inspector 的钉版本：2.11.0（受影响）与 2.12.0（已修复），仅可连接本地 / LAN 的实验 MCP Server，请勿对第三方系统使用。"
      style="margin-bottom: 16px"
    />

    <el-row :gutter="16">
      <el-col :span="14">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>启动配置</span>
              <el-tag
                :type="form.variant === 'vulnerable' ? 'danger' : 'success'"
                effect="dark"
                size="small"
              >
                {{ form.variant === 'vulnerable' ? '受影响版本' : '修复版本' }}
              </el-tag>
            </div>
          </template>

          <el-form label-position="top">
            <el-form-item label="Inspector 版本">
              <el-radio-group v-model="form.variant">
                <el-radio-button value="vulnerable">2.11.0（受影响）</el-radio-button>
                <el-radio-button value="fixed">2.12.0（已修复）</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="传输方式">
              <el-radio-group v-model="form.transport">
                <el-radio-button value="http">Streamable HTTP</el-radio-button>
                <el-radio-button value="sse">SSE</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="MCP Server URL">
              <el-input v-model="form.serverUrl" placeholder="http://127.0.0.1:8787/mcp" />
            </el-form-item>

            <el-form-item>
              <el-button
                type="warning"
                :loading="loading.run"
                @click="runOnce"
              >
                一键验证（CLI 自动握手，无需跳转）
              </el-button>
              <el-button
                type="primary"
                plain
                :loading="loading.start"
                @click="start"
              >
                启动 Web UI
              </el-button>
              <el-button
                type="danger"
                plain
                :loading="loading.stop"
                :disabled="!session.running"
                @click="stop"
              >
                停止
              </el-button>
              <el-button
                type="success"
                plain
                :disabled="!session.running || !session.uiUrl"
                @click="openInspector"
              >
                打开 Inspector 界面
              </el-button>
              <el-button @click="refresh">刷新状态</el-button>
            </el-form-item>

            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="一键验证会直接在本机运行 Inspector CLI（--method initialize），自动走完 initialize → 401 → OAuth 发现 → open()，不打开 Inspector 网页。命令最多等待 45 秒后强杀（OAuth 回调不会完成，超时属预期）；漏洞是否触发请看 CLI 输出与实验 Server 侧证据。"
              style="margin-bottom: 8px"
            />
          </el-form>
        </el-card>
      </el-col>

      <el-col :span="10">
        <el-card shadow="never">
          <template #header>会话状态</template>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="状态">
              <el-tag :type="session.running ? 'success' : 'info'" size="small">
                {{ session.running ? '运行中' : '未运行' }}
              </el-tag>
              <el-tag
                v-if="session.variant"
                :type="session.variant === 'vulnerable' ? 'danger' : 'success'"
                size="small"
                style="margin-left: 8px"
              >
                {{ session.version }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="传输">{{ session.transport ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="Server URL">{{ session.serverUrl ?? '-' }}</el-descriptions-item>
            <el-descriptions-item label="UI 端口">{{ session.port ?? '-' }}</el-descriptions-item>
            <el-descriptions-item v-if="session.error" label="异常">
              <span style="color: var(--el-color-danger)">{{ session.error }}</span>
            </el-descriptions-item>
          </el-descriptions>

          <div v-if="session.launchCommand" class="launch-cmd">
            <div class="launch-cmd-label">启动命令</div>
            <code>{{ session.launchCommand }}</code>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card v-if="runResult" shadow="never" style="margin-top: 16px">
      <template #header>
        <div class="card-header">
          <span>一键验证结果</span>
          <el-tag
            :type="runResult.variant === 'vulnerable' ? 'danger' : 'success'"
            effect="dark"
            size="small"
          >
            {{ runResult.version }}
          </el-tag>
        </div>
      </template>
      <el-descriptions :column="2" border size="small">
        <el-descriptions-item label="退出码">
          {{ runResult.exitCode ?? '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="等待超时">
          <el-tag :type="runResult.timedOut ? 'warning' : 'info'" size="small">
            {{ runResult.timedOut ? '是（预期）' : '否' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="耗时">
          {{ (runResult.durationMs / 1000).toFixed(1) }} 秒
        </el-descriptions-item>
        <el-descriptions-item label="Server URL">
          {{ runResult.serverUrl }}
        </el-descriptions-item>
        <el-descriptions-item label="执行命令" :span="2">
          <code class="cmd-inline">{{ runResult.command }}</code>
        </el-descriptions-item>
      </el-descriptions>
      <div class="run-output-label">CLI 输出</div>
      <pre class="log-box">{{ runResult.output || '无输出' }}</pre>
    </el-card>

    <el-card shadow="never" style="margin-top: 16px">
      <template #header>Inspector 日志</template>
      <pre class="log-box">{{ (session.logTail ?? []).join('\n') || '暂无日志' }}</pre>
    </el-card>
  </div>
</template>

<style scoped>
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.launch-cmd {
  margin-top: 12px;
}

.launch-cmd-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 4px;
}

.launch-cmd code {
  display: block;
  padding: 8px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
  white-space: pre-wrap;
}

.cmd-inline {
  padding: 2px 6px;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 12px;
  word-break: break-all;
  white-space: pre-wrap;
}

.run-output-label {
  margin: 12px 0 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.log-box {
  margin: 0;
  max-height: 320px;
  overflow: auto;
  padding: 12px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
