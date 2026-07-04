// v-reveal directive: scroll-triggered reveal with optional stagger index.
// Usage: v-reveal or v-reveal="2" (index → 60ms stagger each)
// Registered universally; SSR renders plain markup, client attaches the observer.
export default defineNuxtPlugin((nuxtApp) => {
  let io: IntersectionObserver | null = null
  let reduced = false

  if (import.meta.client) {
    reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('revealed')
            io!.unobserve(e.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    )
  }

  nuxtApp.vueApp.directive('reveal', {
    mounted(el: HTMLElement, binding) {
      if (!io || reduced) return
      el.classList.add('reveal-item')
      const idx = Number(binding.value) || 0
      el.style.setProperty('--reveal-delay', `${Math.min(idx, 8) * 60}ms`)
      io.observe(el)
    },
    getSSRProps() {
      return {}
    },
  })
})
