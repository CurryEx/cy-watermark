<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  AimOutlined,
  CopyOutlined,
  DownloadOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FileZipOutlined,
  FullscreenOutlined,
  InfoCircleOutlined,
  LeftOutlined,
  MinusOutlined,
  PlusOutlined,
  RightOutlined,
  ExperimentOutlined,
  BgColorsOutlined,
  SaveOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import {
  activeImage,
  addSampleIdCard,
  getPreviewBitmap,
  images,
  stepActive,
} from '../stores/images.js'
import {
  canClipboard,
  copyCurrent,
  count,
  exportAllFiles,
  exportAllZip,
  exportCurrent,
  exporting,
  percent,
  statusText,
} from '../composables/useExport.js'
import { settings } from '../stores/settings.js'
import { logo } from '../stores/logo.js'
import { drawWatermark } from '../utils/watermark.js'
import { pickFiles } from '../utils/picker.js'
import { clamp } from '../utils/math.js'

const emit = defineEmits(['add', 'add-files', 'open-exif'])

/** 预览渲染的像素上限：兼顾清晰度与拖动滑块的流畅度 */
const PREVIEW_MAX = 2048

const wrapRef = ref(null)
const canvasRef = ref(null)
const natural = ref({ w: 0, h: 0 })
const zoom = ref(1)
const fitMode = ref(true)
const bgMode = ref('checker') // checker | white | black
const showOriginal = ref(false)
const isPanning = ref(false)
const renderBusy = ref(false)

let renderToken = 0
let rafId = 0
let lastPan = null

const index = computed(() => images.list.findIndex((i) => i.id === activeImage.value?.id))

const canvasStyle = computed(() => ({
  width: `${Math.round(natural.value.w * zoom.value)}px`,
  height: `${Math.round(natural.value.h * zoom.value)}px`,
}))

const zoomText = computed(() => `${Math.round(zoom.value * 100)}%`)

/* ------------------------------ 渲染 ------------------------------ */

async function render() {
  const rec = activeImage.value
  const canvas = canvasRef.value
  if (!rec || !canvas) return
  const token = ++renderToken
  if (!canvas.width) renderBusy.value = true
  try {
    const bmp = await getPreviewBitmap(rec.id)
    if (!bmp || token !== renderToken || !canvasRef.value) return
    natural.value = { w: bmp.width, h: bmp.height }

    const k = Math.min(1, PREVIEW_MAX / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * k))
    const h = Math.max(1, Math.round(bmp.height * k))
    if (canvas.width !== w) canvas.width = w
    if (canvas.height !== h) canvas.height = h

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, w, h)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(bmp, 0, 0, w, h)
    if (!showOriginal.value) drawWatermark(ctx, w, h, settings, { logo: logo.bitmap })

    if (fitMode.value) {
      await nextTick()
      applyFit()
    }
  } finally {
    if (token === renderToken) renderBusy.value = false
  }
}

function scheduleRender() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = 0
    render()
  })
}

/* ------------------------------ 缩放 / 平移 ------------------------------ */

function canvasOrigin() {
  const wrap = wrapRef.value
  const canvas = canvasRef.value
  if (!wrap || !canvas) return { left: 0, top: 0 }
  const wr = wrap.getBoundingClientRect()
  const cr = canvas.getBoundingClientRect()
  return {
    left: cr.left - wr.left + wrap.scrollLeft,
    top: cr.top - wr.top + wrap.scrollTop,
  }
}

function applyFit() {
  const wrap = wrapRef.value
  if (!wrap || !natural.value.w) return
  const pad = 34
  const z = Math.min(
    (wrap.clientWidth - pad) / natural.value.w,
    (wrap.clientHeight - pad) / natural.value.h,
  )
  zoom.value = clamp(z, 0.02, 8)
}

async function zoomTo(z, clientX, clientY) {
  const wrap = wrapRef.value
  if (!wrap || !canvasRef.value) return
  const rect = wrap.getBoundingClientRect()
  const px = clientX == null ? rect.width / 2 : clientX - rect.left
  const py = clientY == null ? rect.height / 2 : clientY - rect.top
  const oldZoom = zoom.value
  const before = canvasOrigin()
  const imgX = (wrap.scrollLeft + px - before.left) / oldZoom
  const imgY = (wrap.scrollTop + py - before.top) / oldZoom

  fitMode.value = false
  zoom.value = clamp(z, 0.02, 8)
  await nextTick()
  const after = canvasOrigin()
  wrap.scrollLeft = after.left + imgX * zoom.value - px
  wrap.scrollTop = after.top + imgY * zoom.value - py
}

function onWheel(e) {
  if (!(e.ctrlKey || e.metaKey)) return
  e.preventDefault()
  zoomTo(zoom.value * Math.exp(-e.deltaY * 0.0026), e.clientX, e.clientY)
}

function onPointerDown(e) {
  if (e.button !== 0) return
  const wrap = wrapRef.value
  if (!wrap) return
  lastPan = { x: e.clientX, y: e.clientY, sl: wrap.scrollLeft, st: wrap.scrollTop }
  isPanning.value = true
  wrap.setPointerCapture?.(e.pointerId)
}

function onPointerMove(e) {
  if (!isPanning.value || !lastPan || !wrapRef.value) return
  wrapRef.value.scrollLeft = lastPan.sl - (e.clientX - lastPan.x)
  wrapRef.value.scrollTop = lastPan.st - (e.clientY - lastPan.y)
}

function onPointerUp(e) {
  isPanning.value = false
  lastPan = null
  wrapRef.value?.releasePointerCapture?.(e.pointerId)
}

function fitNow() {
  fitMode.value = true
  applyFit()
}

async function toggleFullscreen() {
  const el = wrapRef.value?.parentElement || wrapRef.value
  try {
    if (!document.fullscreenElement) await el?.requestFullscreen?.()
    else await document.exitFullscreen()
  } catch {
    message.info('当前浏览器不支持全屏预览')
  }
}

const bgIcon = computed(() => (bgMode.value === 'checker' ? '棋格' : bgMode.value === 'white' ? '白底' : '黑底'))
function cycleBg() {
  bgMode.value = bgMode.value === 'checker' ? 'white' : bgMode.value === 'white' ? 'black' : 'checker'
}

async function onSamples() {
  await addSampleIdCard()
  message.success('已生成一张虚拟证件示例图')
}

/** 直接在本组件内拉起文件选择框（避免依赖父组件的抽屉） */
async function openFiles() {
  const files = await pickFiles({ multiple: true })
  if (files.length) emit('add-files', files)
}

/* ------------------------------ 保存 / 导出 ------------------------------ */

const zipLabel = computed(() =>
  count.value > 1 ? `批量导出全部（${count.value} 张 · ZIP）` : '导出（ZIP 打包）',
)

function onSaveMenu({ key }) {
  if (key === 'current') exportCurrent()
  else if (key === 'zip') exportAllZip()
  else if (key === 'files') exportAllFiles()
  else if (key === 'copy') copyCurrent()
}

/** Ctrl / ⌘ + S 保存当前图片 */
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    exportCurrent()
  }
}

/* ------------------------------ 生命周期 ------------------------------ */

let ro = null
onMounted(() => {
  render()
  ro = new ResizeObserver(() => {
    if (fitMode.value) {
      applyFit()
    }
  })
  if (wrapRef.value) ro.observe(wrapRef.value)
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  ro?.disconnect()
  if (rafId) cancelAnimationFrame(rafId)
  renderToken++
  window.removeEventListener('keydown', onKeydown)
})

watch(
  () => activeImage.value?.id,
  async () => {
    fitMode.value = true
    // 画布由 v-if 控制显隐，必须等 DOM 更新完再绘制
    await nextTick()
    render()
  },
  { flush: 'post' },
)
watch(settings, scheduleRender, { deep: true, flush: 'post' })
watch(() => logo.bitmap, scheduleRender, { flush: 'post' })
watch(showOriginal, () => scheduleRender(), { flush: 'post' })

/** 列表清空时重置画布状态 */
watch(
  () => images.list.length,
  (n) => {
    if (!n) {
      natural.value = { w: 0, h: 0 }
      zoom.value = 1
      fitMode.value = true
    }
  },
  { flush: 'post' },
)

defineExpose({ render })
</script>

<template>
  <div class="stage">
    <div class="stage-toolbar">
      <a-button-group size="small">
        <a-tooltip title="上一张 (←)">
          <a-button :disabled="images.list.length < 2" @click="stepActive(-1)">
            <template #icon><LeftOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-button disabled style="min-width: 74px">
          <span class="mono">{{ images.list.length ? index + 1 : 0 }}/{{ images.list.length }}</span>
        </a-button>
        <a-tooltip title="下一张 (→)">
          <a-button :disabled="images.list.length < 2" @click="stepActive(1)">
            <template #icon><RightOutlined /></template>
          </a-button>
        </a-tooltip>
      </a-button-group>

      <a-divider type="vertical" />

      <a-button-group size="small">
        <a-tooltip title="缩小">
          <a-button :disabled="!natural.w" @click="zoomTo(zoom / 1.25)">
            <template #icon><MinusOutlined /></template>
          </a-button>
        </a-tooltip>
        <a-button
          size="small"
          style="min-width: 58px"
          :disabled="!natural.w"
          @click="zoomTo(1)"
        >
          <span class="mono">{{ zoomText }}</span>
        </a-button>
        <a-tooltip title="放大">
          <a-button :disabled="!natural.w" @click="zoomTo(zoom * 1.25)">
            <template #icon><PlusOutlined /></template>
          </a-button>
        </a-tooltip>
      </a-button-group>

      <a-tooltip title="适应窗口">
        <a-button size="small" :disabled="!natural.w" @click="fitNow">
          <template #icon><AimOutlined /></template>
          适应
        </a-button>
      </a-tooltip>

      <a-dropdown :trigger="['click']" placement="bottomLeft">
        <a-button
          type="primary"
          size="small"
          class="toolbar-save"
          :loading="exporting"
          :disabled="!count"
        >
          <template #icon><SaveOutlined /></template>
          保存
        </a-button>
        <template #overlay>
          <a-menu @click="onSaveMenu">
            <a-menu-item key="current" :disabled="exporting">
              <SaveOutlined /> 保存当前图片（Ctrl+S）
            </a-menu-item>
            <a-menu-item key="zip" :disabled="exporting">
              <FileZipOutlined /> {{ zipLabel }}
            </a-menu-item>
            <a-menu-item key="files" :disabled="exporting">
              <DownloadOutlined /> 逐个下载全部（不打包）
            </a-menu-item>
            <a-menu-item key="copy" :disabled="exporting || !canClipboard">
              <CopyOutlined /> 复制当前图片到剪贴板
            </a-menu-item>
          </a-menu>
        </template>
      </a-dropdown>

      <span v-if="exporting" class="toolbar-export" :title="statusText">
        <a-progress :percent="percent" size="small" :show-info="false" style="width: 68px" />
        <span class="mono">{{ percent }}%</span>
      </span>

      <a-tooltip title="切换画布底色（透明图片看效果用）">
        <a-button size="small" :disabled="!natural.w" @click="cycleBg">
          <template #icon><BgColorsOutlined /></template>
          {{ bgIcon }}
        </a-button>
      </a-tooltip>

      <a-tooltip title="按住查看原图（松开恢复水印）">
        <a-button
          size="small"
          :type="showOriginal ? 'primary' : 'default'"
          :disabled="!natural.w"
          @pointerdown="showOriginal = true"
          @pointerup="showOriginal = false"
          @pointerleave="showOriginal = false"
        >
          <template #icon>
            <EyeInvisibleOutlined v-if="showOriginal" />
            <EyeOutlined v-else />
          </template>
          原图
        </a-button>
      </a-tooltip>

      <span class="toolbar-spacer" />

      <a-tooltip title="查看当前图片的 EXIF 元数据 (I)">
        <a-button size="small" :disabled="!count" @click="emit('open-exif')">
          <template #icon><InfoCircleOutlined /></template>
          EXIF
        </a-button>
      </a-tooltip>

      <span v-if="natural.w" class="zoom-label">
        原图 {{ natural.w }}×{{ natural.h }}
      </span>

      <a-tooltip title="全屏预览">
        <a-button size="small" :disabled="!natural.w" @click="toggleFullscreen">
          <template #icon><FullscreenOutlined /></template>
        </a-button>
      </a-tooltip>
    </div>

    <div
      v-if="images.list.length"
      ref="wrapRef"
      class="stage-canvas-wrap"
      :class="[`bg-${bgMode}`, { 'is-panning': isPanning }]"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <div class="stage-canvas-inner">
        <canvas ref="canvasRef" class="stage-canvas" :style="canvasStyle" />
      </div>
      <div v-if="renderBusy" class="stage-loading">
        <a-spin size="large" />
      </div>
    </div>

    <div v-else class="stage-empty">
      <div class="empty-rich">
        <template v-if="images.busy">
          <a-spin size="large" />
          <p class="empty-sub" style="margin-top: 10px">{{ images.status || '正在读取图片…' }}</p>
        </template>
        <template v-else>
          <svg class="empty-art" viewBox="0 0 120 84" aria-hidden="true">
            <rect x="4" y="10" width="112" height="68" rx="8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6 5" />
            <circle cx="30" cy="30" r="7" fill="currentColor" opacity=".35" />
            <path d="M12 70l26-26 18 18 14-12 38 30z" fill="currentColor" opacity=".22" />
          </svg>
          <p class="empty-title">把图片拖进来，或从剪贴板粘贴 (Ctrl+V)</p>
          <p class="empty-sub">支持一次选择多张 · 全部在浏览器本地处理，不会上传到任何服务器</p>
          <a-space wrap style="justify-content: center; margin-top: 10px">
            <a-button type="primary" @click="openFiles">
              <template #icon><PlusOutlined /></template>
              选择图片
            </a-button>
            <a-button @click="onSamples">
              <template #icon><ExperimentOutlined /></template>
              试试示例证件
            </a-button>
          </a-space>
          <p class="empty-sub" style="margin-top: 16px">
            <ThunderboltOutlined /> 小技巧：设置好参数后按 Ctrl+S 可直接导出
          </p>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stage-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.08);
}

.toolbar-export {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}

/* 主操作按钮给足宽度，避免两个字挤成一团 */
.toolbar-save {
  min-width: 92px;
}

.empty-rich {
  text-align: center;
  max-width: 460px;
}
.empty-art {
  width: 138px;
  height: 96px;
  color: var(--text-tertiary);
  margin-bottom: 6px;
}
.empty-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 6px;
}
.empty-sub {
  font-size: 12.5px;
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.7;
}
</style>
