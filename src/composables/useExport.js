/**
 * 导出动作（模块级单例）
 *
 * 导出按钮已经从右侧「导出设置」搬到了预览工具栏的「保存」下拉里，
 * 但进度状态需要两边共享，所以放在这里。
 */
import { computed, ref } from 'vue'
import { message } from 'ant-design-vue'
import { activeImage, images } from '../stores/images.js'
import { settings } from '../stores/settings.js'
import { logo } from '../stores/logo.js'
import { exportBatch, outputFilename, renderOne } from '../utils/exporter.js'
import { downloadBlob } from '../utils/image.js'

export const exporting = ref(false)
export const percent = ref(0)
export const statusText = ref('')

export const count = computed(() => images.list.length)

export const canClipboard =
  typeof ClipboardItem !== 'undefined' && !!navigator.clipboard?.write

function guard() {
  if (exporting.value) return false
  if (!count.value) {
    message.warning('请先添加图片')
    return false
  }
  return true
}

async function runExport(records, mode) {
  exporting.value = true
  percent.value = 0
  statusText.value = '准备中…'
  try {
    await exportBatch({
      records,
      settings,
      logo: logo.bitmap,
      mode,
      onProgress: (done, total, name) => {
        percent.value = total ? Math.round((done / total) * 100) : 0
        statusText.value = name ? `${done}/${total} · ${name}` : `${done}/${total} 完成`
      },
    })
    message.success(records.length > 1 && mode === 'zip' ? '打包完成，开始下载' : '导出完成')
  } catch (e) {
    console.error(e)
    message.error(`导出失败：${e.message || e}`)
  } finally {
    exporting.value = false
    statusText.value = ''
  }
}

/** 导出当前这一张 */
export async function exportCurrent() {
  if (!guard()) return
  const rec = activeImage.value
  if (!rec) return
  exporting.value = true
  statusText.value = '渲染中…'
  try {
    const { blob, width, height } = await renderOne(rec, settings, { logo: logo.bitmap })
    downloadBlob(blob, outputFilename(rec, settings, 1, { width, height }))
    message.success('已保存当前图片')
  } catch (e) {
    message.error(`导出失败：${e.message || e}`)
  } finally {
    exporting.value = false
    statusText.value = ''
  }
}

/** 全部导出：多张时打包成 ZIP */
export function exportAllZip() {
  if (!guard()) return
  if (count.value === 1) {
    runExport(images.list, 'files')
    return
  }
  runExport(images.list, 'zip')
}

/** 逐个下载（不打包） */
export function exportAllFiles() {
  if (!guard()) return
  if (count.value > 6) {
    message.info('图片较多时逐个下载可能被浏览器拦截，建议使用 ZIP 打包')
  }
  runExport(images.list, 'files')
}

/** 复制当前图片到剪贴板（PNG） */
export async function copyCurrent() {
  if (!guard()) return
  if (!canClipboard) {
    message.error('当前浏览器不支持写剪贴板图片')
    return
  }
  const rec = activeImage.value
  if (!rec) return
  exporting.value = true
  statusText.value = '复制中…'
  try {
    const { blob } = await renderOne(rec, { ...settings, format: 'png' }, { logo: logo.bitmap })
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
    message.success('已复制到剪贴板（PNG）')
  } catch (e) {
    message.error(`复制失败：${e.message || e}`)
  } finally {
    exporting.value = false
    statusText.value = ''
  }
}
