export function usePalette() {
  const open = useState('palette-open', () => false)
  return {
    open,
    show: () => (open.value = true),
    hide: () => (open.value = false),
    toggle: () => (open.value = !open.value),
  }
}
