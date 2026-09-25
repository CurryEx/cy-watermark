/** 图片解码 / 缩略图 / 下载 */

export const ACCEPT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
  'image/bmp',
]

/** 判断是否是浏览器能解码的图片 */
export function isImageFile(file) {
  if (!file) return false
  if (ACCEPT_TYPES.includes(file.type)) return true
  return /\.(jpe?g|png|webp|avif|gif|bmp)$/i.test(file.name || '')
}

/**
 * 解码为 ImageBitmap（自动应用 EXIF 方向）
 * 浏览器不支持 `imageOrientation` 时回退到 <img> + canvas 重绘
 */
export async function decodeToBitmap(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      try {
        return await createImageBitmap(file)
      } catch {
        /* 继续走回退方案 */
      }
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'sync'
    img.src = url
    if (img.decode) await img.decode()
    else
      await new Promise((res, rej) => {
        img.onload = res
        img.onerror = rej
      })
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, img.naturalWidth)
    canvas.height = Math.max(1, img.naturalHeight)
    canvas.getContext('2d').drawImage(img, 0, 0)
    return await createImageBitmap(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

/** 生成小缩略图 dataURL（用于列表展示） */
export function makeThumbnail(bitmap, max = 240) {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  try {
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch {
    return ''
  }
}

/** 触发下载 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // 给浏览器一点时间去读取
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
