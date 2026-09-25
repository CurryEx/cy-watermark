/** 图片列表状态 */
import { computed, reactive } from 'vue'
import { decodeToBitmap, isImageFile, makeThumbnail } from '../utils/image.js'
import { createSampleIdCard } from '../utils/sample.js'
import { parseExif } from '../utils/exif.js'

export const images = reactive({
  list: [],
  activeId: null,
  busy: false,
  status: '',
})

export const activeImage = computed(
  () => images.list.find((i) => i.id === images.activeId) || null,
)

export const selectedImages = computed(() => images.list)

let uid = 0
const nextId = () => `img-${Date.now().toString(36)}-${++uid}`

/* ------------------ 预览用位图缓存（只缓存当前一张，控制内存） ------------------ */
let previewCache = { id: null, bitmap: null }

export function releasePreviewBitmap() {
  previewCache.bitmap?.close?.()
  previewCache = { id: null, bitmap: null }
}

export async function getPreviewBitmap(id) {
  if (previewCache.id === id && previewCache.bitmap) return previewCache.bitmap
  const record = images.list.find((i) => i.id === id)
  if (!record) return null
  releasePreviewBitmap()
  const bmp = await decodeToBitmap(record.file)
  previewCache = { id, bitmap: bmp }
  return bmp
}

/* ------------------------------- 增删改 ------------------------------- */

/**
 * 添加图片
 * @param {FileList|File[]} fileList
 * @param {(done:number,total:number,name:string)=>void} onProgress
 */
export async function addFiles(fileList, onProgress) {
  const files = Array.from(fileList || []).filter(isImageFile)
  if (!files.length) return { added: 0, skipped: (fileList?.length || 0) }

  images.busy = true
  let added = 0
  try {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      onProgress?.(i, files.length, file.name)
      images.status = `读取中 ${i + 1}/${files.length}`
      let bitmap = null
      try {
        bitmap = await decodeToBitmap(file)
        const thumb = makeThumbnail(bitmap)
        const record = {
          id: nextId(),
          file,
          name: file.name || `image-${i}.jpg`,
          size: file.size,
          width: bitmap.width,
          height: bitmap.height,
          thumb,
          exif: null,
        }
        images.list.push(record)
        added++
        if (!images.activeId) images.activeId = record.id
      } catch {
        /* 解码失败的图片直接跳过 */
      } finally {
        bitmap?.close?.()
      }
    }
    onProgress?.(files.length, files.length, '')
  } finally {
    images.busy = false
    images.status = ''
  }
  return { added, skipped: files.length - added }
}

/** 添加一张「虚拟证件」示例图，用来快速体验水印效果 */
export async function addSampleIdCard() {
  const file = await createSampleIdCard()
  return addFiles([file], undefined)
}

export function removeImage(id) {
  const idx = images.list.findIndex((i) => i.id === id)
  if (idx < 0) return
  images.list.splice(idx, 1)
  if (previewCache.id === id) releasePreviewBitmap()
  if (images.activeId === id) {
    const next = images.list[Math.min(idx, images.list.length - 1)]
    images.activeId = next ? next.id : null
  }
}

export function clearImages() {
  releasePreviewBitmap()
  images.list.splice(0, images.list.length)
  images.activeId = null
}

export function selectImage(id) {
  if (images.activeId === id) return
  images.activeId = id
}

export function moveImage(id, delta) {
  const idx = images.list.findIndex((i) => i.id === id)
  const target = idx + delta
  if (idx < 0 || target < 0 || target >= images.list.length) return
  const [item] = images.list.splice(idx, 1)
  images.list.splice(target, 0, item)
}

export function stepActive(delta) {
  if (!images.list.length) return
  const idx = images.list.findIndex((i) => i.id === images.activeId)
  const next = (idx + delta + images.list.length) % images.list.length
  images.activeId = images.list[next].id
}

/** 懒加载 EXIF（只有打开信息面板时才会解析） */
export async function ensureExif(record) {
  if (!record) return {}
  if (record.exif) return record.exif
  if (!/\.jpe?g$/i.test(record.name) && record.file.type !== 'image/jpeg') {
    record.exif = {}
    return record.exif
  }
  try {
    const buffer = await record.file.arrayBuffer()
    record.exif = parseExif(buffer)
  } catch {
    record.exif = {}
  }
  return record.exif
}
