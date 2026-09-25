/** 通用格式化 */

export function formatBytes(bytes) {
  if (!bytes || bytes < 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`
}

const pad = (n) => String(n).padStart(2, '0')

/**
 * 根据模板生成文件名（不含扩展名）
 * 支持 {name} {index} {date} {time} {w} {h} {ext} {origin}
 */
export function renderFilename(pattern, ctx) {
  const d = new Date()
  const map = {
    name: ctx.name || 'image',
    origin: ctx.origin || 'image',
    index: String(ctx.index ?? 1).padStart(2, '0'),
    date: `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`,
    time: `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`,
    w: ctx.width ?? '',
    h: ctx.height ?? '',
    ext: ctx.ext ?? 'jpg',
  }
  let out = String(pattern || '{name}-watermark')
  out = out.replace(/\{(\w+)\}/g, (_, k) => (map[k] !== undefined ? String(map[k]) : `{${k}}`))
  // 去掉 Windows / macOS / Linux 非法字符
  out = out.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\s+/g, ' ').trim()
  return out || 'watermark'
}

export function baseName(filename) {
  return String(filename || 'image').replace(/\.[^.]+$/, '')
}

export function extOf(filename) {
  const m = /\.([^.]+)$/.exec(String(filename || ''))
  return m ? m[1].toLowerCase() : ''
}
