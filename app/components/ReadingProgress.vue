<script setup lang="ts">
const progress = ref(0)

function onScroll() {
  const h = document.documentElement
  const max = h.scrollHeight - h.clientHeight
  progress.value = max > 0 ? Math.min(1, h.scrollTop / max) : 0
}

onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <div class="fixed top-0 left-0 right-0 z-50 h-[2px] pointer-events-none">
    <div
      class="h-full bg-accent transition-[width] duration-100 ease-out"
      :style="{ width: `${progress * 100}%`, boxShadow: progress > 0.01 ? 'var(--glow)' : 'none' }"
    />
  </div>
</template>
