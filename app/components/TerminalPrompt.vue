<script setup lang="ts">
defineProps<{ cmd: string }>()
</script>

<template>
  <div class="font-mono text-sm text-muted flex items-center gap-2">
    <span class="text-accent select-none">$</span>
    <span>{{ cmd }}</span>
  </div>
</template>
