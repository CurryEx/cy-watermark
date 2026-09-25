import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * 全窗口拖拽 + 剪贴板粘贴图片
 * @param {(files: File[]) => void} onFiles
 */
export function useGlobalDrop(onFiles) {
  const dragging = ref(false)
  let depth = 0

  const hasFiles = (e) =>
    Array.from(e.dataTransfer?.types || []).includes('Files')

  const onDragEnter = (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth++
    dragging.value = true
  }
  const onDragOver = (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }
  const onDragLeave = (e) => {
    if (!hasFiles(e)) return
    depth = Math.max(0, depth - 1)
    if (depth === 0) dragging.value = false
  }
  const onDrop = (e) => {
    if (!hasFiles(e)) return
    e.preventDefault()
    depth = 0
    dragging.value = false
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) onFiles(files)
  }
  const onPaste = (e) => {
    const items = Array.from(e.clipboardData?.items || [])
    const files = items
      .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
      .map((it) => it.getAsFile())
      .filter(Boolean)
    if (files.length) onFiles(files)
  }

  onMounted(() => {
    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    window.addEventListener('paste', onPaste)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('dragenter', onDragEnter)
    window.removeEventListener('dragover', onDragOver)
    window.removeEventListener('dragleave', onDragLeave)
    window.removeEventListener('drop', onDrop)
    window.removeEventListener('paste', onPaste)
  })

  return { dragging }
}
