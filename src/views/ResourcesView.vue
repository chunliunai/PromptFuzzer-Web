<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { resourceApi } from '../api'

const loading = ref(false)
const goals = ref<string[]>([])
const techniques = ref<string[]>([])

async function loadData() {
  loading.value = true
  try {
    ;[goals.value, techniques.value] = await Promise.all([
      resourceApi.goals(),
      resourceApi.techniques(),
    ])
  } finally {
    loading.value = false
  }
}

onMounted(loadData)
</script>

<template>
  <div v-loading="loading" class="page-stack">
    <section class="page-actions">
      <div>
        <h1>资源配置</h1>
        <p>前端动态读取后端可用的 Goal 和 Technique，不维护硬编码副本。</p>
      </div>
      <el-button @click="loadData">刷新</el-button>
    </section>

    <section class="content-grid two-columns">
      <div class="panel">
        <div class="panel-heading">
          <div>
            <h2>Goals</h2>
            <p>{{ goals.length }} 个攻击目标</p>
          </div>
        </div>
        <div class="resource-list">
          <div v-for="goal in goals" :key="goal" class="resource-item">
            <span class="resource-dot" />
              <span>{{ goal }}</span>
          </div>
        </div>
        <el-empty v-if="!goals.length" description="暂无 Goal" />
      </div>

      <div class="panel">
        <div class="panel-heading">
          <div>
            <h2>Techniques</h2>
            <p>{{ techniques.length }} 个测试手法</p>
          </div>
        </div>
        <div class="resource-list">
          <div v-for="technique in techniques" :key="technique" class="resource-item">
            <span class="resource-dot secondary" />
              <span>{{ technique }}</span>
          </div>
        </div>
        <el-empty v-if="!techniques.length" description="暂无 Technique" />
      </div>
    </section>
  </div>
</template>
