<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ status?: string }>()

const type = computed(() => {
  const value = props.status?.toUpperCase()
  if (['COMPLETED', 'SUCCESS', 'VERIFIED', 'READY'].includes(value ?? '')) return 'success'
  if (['FAILED', 'ERROR', 'BLOCKED', 'CONTRADICTED'].includes(value ?? '')) return 'danger'
  if (['RUNNING', 'EXECUTING', 'PARTIALLY_VERIFIED'].includes(value ?? '')) return 'warning'
  return 'info'
})
</script>

<template>
  <el-tag :type="type" effect="light" size="small">
    {{ status || 'UNKNOWN' }}
  </el-tag>
</template>
