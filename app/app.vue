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

useHead({
  script: [
    {
      // set theme class before paint to avoid FOUC
      innerHTML: `(function(){try{var t=localStorage.getItem('garden-theme');if(t==='light'){document.documentElement.classList.remove('dark')}else{document.documentElement.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})()`,
      tagPosition: 'head',
    },
  ],
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg text-ink">
    <SiteHeader />
    <main class="flex-1 w-full">
      <NuxtPage />
    </main>
    <SiteFooter />
    <CommandPalette />
  </div>
</template>
