import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * PWA 安装引导
 * - Chromium：捕获 beforeinstallprompt，主动弹出安装
 * - iOS Safari：没有该事件，返回 isIOS 让界面提示"共享 → 添加到主屏幕"
 */
export function usePwaInstall() {
  const deferredPrompt = ref(null)
  const canInstall = ref(false)
  const installed = ref(false)
  const isIOS = ref(false)

  const onBeforeInstall = (e) => {
    e.preventDefault()
    deferredPrompt.value = e
    canInstall.value = true
  }
  const onInstalled = () => {
    installed.value = true
    canInstall.value = false
    deferredPrompt.value = null
  }

  const isStandalone = () =>
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true

  onMounted(() => {
    installed.value = isStandalone()
    const ua = window.navigator.userAgent || ''
    isIOS.value = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    window.addEventListener('beforeinstallprompt', onBeforeInstall)
    window.addEventListener('appinstalled', onInstalled)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstall)
    window.removeEventListener('appinstalled', onInstalled)
  })

  async function promptInstall() {
    const evt = deferredPrompt.value
    if (!evt) return 'unavailable'
    evt.prompt()
    const { outcome } = await evt.userChoice
    deferredPrompt.value = null
    canInstall.value = false
    return outcome
  }

  return { canInstall, installed, isIOS, promptInstall }
}
