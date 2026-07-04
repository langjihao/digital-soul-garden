<script setup lang="ts">
const props = defineProps<{ cmd: string; typed?: boolean }>()
const chWidth = computed(() => `${props.cmd.length}ch`)
</script>

<template>
  <div class="font-mono text-sm text-muted flex items-center gap-2">
    <span class="text-accent select-none">$</span>
    <span v-if="typed" class="typed" :style="{ '--typed-ch': chWidth }">{{ cmd }}</span>
    <span v-else>{{ cmd }}</span>
  </div>
</template>
