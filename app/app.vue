<script setup lang="ts">
const { toggle: togglePalette, hide } = usePalette()

onMounted(() => {
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      togglePalette()
    }
  })
})

const route = useRoute()
watch(() => route.path, () => hide())
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-ink">
    <SiteHeader />
    <main class="flex-1 w-full">
      <NuxtPage />
    </main>
    <SiteFooter />
    <CommandPalette />
    <TwinChat />
  </div>
</template>
