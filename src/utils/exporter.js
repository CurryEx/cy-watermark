/** 导出：渲染 → 编码 → （可选）EXIF 回填 → 下载 / 打包 */
import { drawWatermark } from './watermark.js'
import { decodeToBitmap, downloadBlob } from './image.js'
import { extractJpegExif, injectJpegExif, neutralizeOrientation } from './exif.js'
import { baseName, renderFilename } from './format.js'

export const MIME = {
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

export function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    if (typeof canvas.toBlob === 'function') {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('画布编码失败'))),
        type,
        quality,
      )
      return
    }
    // 极老浏览器回退
    try {
      const dataUrl = canvas.toDataURL(type, quality)
      const bin = atob(dataUrl.split(',')[1])
      const arr = new Uint8Array(bin.length)
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
      resolve(new Blob([arr], { type }))
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 渲染单张图片
 * @param {object} record  图片记录 { id, file, name }
 * @param {object} settings 水印设置
 * @param {{logo?: ImageBitmap|null, onStage?: (s:string)=>void}} opts
 * @returns {Promise<{blob: Blob, width: number, height: number}>}
 */
export async function renderOne(record, settings, opts = {}) {
  const { logo = null, onStage } = opts
  const format = settings.format || 'jpeg'
  const mime = MIME[format] || 'image/jpeg'

  onStage?.('decode')
  const bmp = await decodeToBitmap(record.file)
  try {
    let w = bmp.width
    let h = bmp.height
    const max = Number(settings.maxSize) || 0
    if (max > 0 && Math.max(w, h) > max) {
      const k = max / Math.max(w, h)
      w = Math.max(1, Math.round(w * k))
      h = Math.max(1, Math.round(h * k))
    }

    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    // JPEG 没有 alpha 通道，透明区域会被填黑，这里先铺底色
    if (format === 'jpeg') {
      ctx.fillStyle = settings.jpegBackground || '#ffffff'
      ctx.fillRect(0, 0, w, h)
    }

    ctx.drawImage(bmp, 0, 0, w, h)
    onStage?.('draw')
    drawWatermark(ctx, w, h, settings, { logo })

    onStage?.('encode')
    const quality = format === 'png' ? undefined : Math.min(1, Math.max(0.1, (Number(settings.quality) || 92) / 100))
    let blob = await canvasToBlob(canvas, mime, quality)

    // 保留 EXIF（仅 JPEG 源 → JPEG 输出）
    if (settings.keepExif && format === 'jpeg') {
      try {
        onStage?.('exif')
        const srcBuffer = await record.file.arrayBuffer()
        const segment = extractJpegExif(srcBuffer)
        if (segment) {
          neutralizeOrientation(segment)
          const outBuffer = await blob.arrayBuffer()
          blob = new Blob([injectJpegExif(outBuffer, segment)], { type: mime })
        }
      } catch {
        /* EXIF 回填失败不影响主流程 */
      }
    }

    return { blob, width: w, height: h }
  } finally {
    bmp.close?.()
  }
}

/** 单张导出文件名 */
export function outputFilename(record, settings, index, size = {}) {
  const ext = settings.format === 'jpeg' ? 'jpg' : settings.format
  const name = renderFilename(settings.filenamePattern, {
    name: baseName(record.name),
    origin: record.name,
    index,
    width: size.width,
    height: size.height,
    ext,
  })
  return `${name}.${ext}`
}

/**
 * 批量导出
 * @param {object} p
 * @param {Array} p.records
 * @param {object} p.settings
 * @param {ImageBitmap|null} p.logo
 * @param {'zip'|'files'} p.mode
 * @param {(done:number, total:number, name:string)=>void} p.onProgress
 */
export async function exportBatch({ records, settings, logo, mode = 'zip', onProgress }) {
  const total = records.length
  const results = []

  for (let i = 0; i < total; i++) {
    const rec = records[i]
    onProgress?.(i, total, rec.name)
    const { blob, width, height } = await renderOne(rec, settings, { logo })
    results.push({ blob, filename: outputFilename(rec, settings, i + 1, { width, height }) })
  }
  onProgress?.(total, total, '')

  if (total > 1 && mode === 'zip') {
    const { default: JSZip } = await import('jszip')
    const zip = new JSZip()
    const used = new Set()
    for (const r of results) {
      let name = r.filename
      let n = 2
      while (used.has(name)) {
        const dot = r.filename.lastIndexOf('.')
        name = `${r.filename.slice(0, dot)}-${n++}${r.filename.slice(dot)}`
      }
      used.add(name)
      zip.file(name, r.blob)
    }
    const zipBlob = await zip.generateAsync(
      { type: 'blob', compression: 'STORE' },
      (meta) => onProgress?.(total, total, `打包中 ${Math.round(meta.percent)}%`),
    )
    const zipName = renderFilename(settings.zipName || 'watermarked-{date}-{time}', {})
    downloadBlob(zipBlob, `${zipName}.zip`)
    return results
  }

  for (const r of results) {
    downloadBlob(r.blob, r.filename)
    // 连续触发下载时给浏览器一点间隔，避免被拦截
    await new Promise((r2) => setTimeout(r2, 260))
  }
  return results
}
