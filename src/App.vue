<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { message, Modal, theme as antdTheme } from 'ant-design-vue'
import zhCN from 'ant-design-vue/es/locale/zh_CN'
import AppHeader from './components/AppHeader.vue'
import ImagePanel from './components/ImagePanel.vue'
import PreviewStage from './components/PreviewStage.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ExifModal from './components/ExifModal.vue'
import { activeImage, addFiles, images, stepActive } from './stores/images.js'
import { resolveRepoUrl, THEME_KEY } from './config/defaults.js'
import { useGlobalDrop } from './composables/useGlobalDrop.js'
import { usePwaInstall } from './composables/usePwaInstall.js'

/* ------------------------------ 主题 ------------------------------ */
const isDark = ref(localStorage.getItem(THEME_KEY) === 'dark')
watch(
  isDark,
  (v) => {
    document.documentElement.dataset.theme = v ? 'dark' : 'light'
    localStorage.setItem(THEME_KEY, v ? 'dark' : 'light')
  },
  { immediate: true },
)

const themeConfig = computed(() => ({
  algorithm: isDark.value ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
  token: {
    colorPrimary: '#4f46e5',
    borderRadius: 8,
    fontSize: 14,
    wireframe: false,
  },
}))

/* ------------------------------ 全局拖拽 / 粘贴 ------------------------------ */
async function ingest(files) {
  const list = Array.from(files || [])
  if (!list.length) return
  const res = await addFiles(list)
  if (res.added) message.success(`已添加 ${res.added} 张图片`)
  if (res.skipped) message.warning(`${res.skipped} 个文件无法解码，已跳过`)
}

const { dragging } = useGlobalDrop(ingest)

/* 阻止浏览器把拖入的图片当作页面打开 */
function blockDefault(e) {
  if (e.target === document.body || e.target === document.documentElement) e.preventDefault()
}

/* ------------------------------ PWA 安装 ------------------------------ */
const { canInstall, installed, isIOS, promptInstall } = usePwaInstall()

async function onInstall() {
  if (canInstall.value) {
    const outcome = await promptInstall()
    if (outcome === 'accepted') message.success('安装中…装好后可以从桌面直接打开')
    return
  }
  Modal.info({
    title: isIOS.value ? '把「加水印」添加到主屏幕' : '安装到桌面',
    content: isIOS.value
      ? '在 Safari 中点击底部的“分享”按钮 → 选择“添加到主屏幕”。添加后即可离线使用。'
      : '请打开浏览器右上角菜单，选择“安装应用 / 添加到主屏幕”。安装后可离线使用，图片依然只在本机处理。',
    okText: '知道了',
  })
}

/* ------------------------------ 移动端抽屉 ------------------------------ */
const leftOpen = ref(false)
const rightOpen = ref(false)
const exifOpen = ref(false)
const repoUrl = resolveRepoUrl()

/* ------------------------------ 快捷键 ------------------------------ */
function onKeydown(e) {
  const el = document.activeElement
  const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
  if (typing || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.key === 'ArrowLeft') stepActive(-1)
  else if (e.key === 'ArrowRight') stepActive(1)
  else if (e.key.toLowerCase() === 'i' && activeImage.value) exifOpen.value = true
  else if (e.key === 'Escape') exifOpen.value = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('dragover', blockDefault)
  window.addEventListener('drop', blockDefault)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('dragover', blockDefault)
  window.removeEventListener('drop', blockDefault)
})
</script>

<template>
  <a-config-provider :locale="zhCN" :theme="themeConfig">
    <div class="app-shell">
      <AppHeader
        v-model:is-dark="isDark"
        :can-install="canInstall"
        :installed="installed"
        :is-i-o-s="isIOS"
        :image-count="images.list.length"
        :repo-url="repoUrl"
        @install="onInstall"
        @open-left="leftOpen = true"
        @open-right="rightOpen = true"
      />

      <div class="app-body">
        <ImagePanel />
        <PreviewStage @add-files="ingest" @open-exif="exifOpen = true" />
        <SettingsPanel />
      </div>

      <!-- 窄屏：左右面板改为抽屉 -->
      <a-drawer
        v-model:open="leftOpen"
        title="图片列表"
        placement="left"
        :width="'min(320px, 92vw)'"
        :body-style="{ padding: 0, height: '100%', '--panel-left-w': '100%' }"
      >
        <ImagePanel />
      </a-drawer>

      <a-drawer
        v-model:open="rightOpen"
        title="水印参数"
        placement="right"
        :width="'min(380px, 94vw)'"
        :body-style="{ padding: 0, height: '100%', '--panel-right-w': '100%' }"
      >
        <SettingsPanel />
      </a-drawer>

      <ExifModal v-model:open="exifOpen" :record="activeImage" />

      <transition name="fade">
        <div v-if="dragging" class="drop-overlay">
          <div class="drop-overlay-card">松手即可添加图片</div>
        </div>
      </transition>
    </div>
  </a-config-provider>
</template>
