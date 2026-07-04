export function useTwin() {
  const open = useState('twin-open', () => false)
  return {
    open,
    show: () => (open.value = true),
    hide: () => (open.value = false),
    toggle: () => (open.value = !open.value),
  }
}
