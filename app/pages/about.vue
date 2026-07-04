<script setup lang="ts">
const { t } = useLang()
useHead({ title: computed(() => `${t.value.about} · ~/garden`) })
</script>

<template>
  <div class="mx-auto max-w-3xl px-5 pt-12">
    <TerminalPrompt cmd="cat about.md" />
    <h1 class="mt-3 text-2xl sm:text-3xl font-bold">{{ t.about }}</h1>

    <div class="prose mt-8 pb-8">
      <p>
        这座花园是对平台化的有意反向：<strong>长文、碎念与媒体全部活在同一个 Git 仓库里</strong>。
        写作即提交，发布即推送——内容和代码走同一条流水线，享受同样的版本控制、Review 与回滚能力。
      </p>
      <p>
        站点由 <a href="https://nuxt.com" target="_blank" rel="noopener">Nuxt</a> 驱动，
        Markdown 经由构建期管道解析、着色与索引；⌘K 调起的命令面板做全站混合检索；
        右下角的浮窗是一个 RAG 孪生，会先取 top-k 内容片段，再以我的口吻流式作答。
      </p>
      <blockquote>
        <p>数字花园的意义不在于「完成」，而在于持续生长。每一次 push 都是一次浇水。</p>
      </blockquote>
      <h2>技术栈</h2>
      <ul>
        <li>Nuxt 4 + Nitro，SSR 运行于自托管 Node，经 Cloudflare Tunnel 出站</li>
        <li>@nuxt/content：Markdown 即数据库，Shiki 代码高亮</li>
        <li>Tailwind CSS v4：原子化样式 + 设计令牌双主题</li>
        <li>AI 孪生：流式对话接口，检索增强，口吻对齐</li>
      </ul>
      <h2>联系</h2>
      <p>
        GitHub：<a href="https://github.com/langjihao" target="_blank" rel="noopener">@langjihao</a>，
        或直接在右下角与孪生对话——它比邮箱回得快。
      </p>
    </div>
  </div>
</template>
