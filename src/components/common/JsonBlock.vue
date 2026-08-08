<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ value: unknown; emptyText?: string }>()

const content = computed(() => {
  if (props.value === null || props.value === undefined || props.value === '') {
    return props.emptyText ?? '暂无数据'
  }
  if (typeof props.value === 'string') {
    try {
      return JSON.stringify(JSON.parse(props.value), null, 2)
    } catch {
      return props.value
    }
  }
  return JSON.stringify(props.value, null, 2)
})
</script>

<template>
  <pre class="json-block">{{ content }}</pre>
</template>
