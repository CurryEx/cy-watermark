import { onBeforeUnmount, onMounted, ref } from 'vue'

/** 响应式媒体查询 */
export function useMediaQuery(query) {
  const matches = ref(false)
  let mql = null
  const handler = (e) => (matches.value = e.matches)

  onMounted(() => {
    mql = window.matchMedia(query)
    matches.value = mql.matches
    mql.addEventListener('change', handler)
  })
  onBeforeUnmount(() => mql?.removeEventListener('change', handler))

  return matches
}
