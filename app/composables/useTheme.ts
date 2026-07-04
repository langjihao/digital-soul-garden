export function useTheme() {
  const isDark = useState('garden-dark', () => true)

  onMounted(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })

  function toggle() {
    isDark.value = !isDark.value
    if (import.meta.client) {
      document.documentElement.classList.toggle('dark', isDark.value)
      localStorage.setItem('garden-theme', isDark.value ? 'dark' : 'light')
    }
  }

  return { isDark, toggle }
}
