<script setup lang="ts">
const { t } = useLang()
const year = new Date().getFullYear()
</script>

<template>
  <footer class="border-t border-border mt-20">
    <div class="mx-auto max-w-5xl px-5 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-muted">
      <span>© {{ year }} ~/garden</span>
      <span>{{ t.footer }}</span>
      <div class="flex items-center gap-4">
        <a href="https://github.com/langjihao/digital-soul-garden" class="hover:text-accent transition-colors" target="_blank" rel="noopener">GitHub</a>
        <a href="/rss.xml" class="hover:text-accent transition-colors">RSS</a>
      </div>
    </div>
  </footer>
</template>
