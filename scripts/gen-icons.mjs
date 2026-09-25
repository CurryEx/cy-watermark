/**
 * 纯 Node（零依赖）生成 PWA 图标
 *   node scripts/gen-icons.mjs
 *
 * 自己实现了一个极简 PNG 编码器（IHDR + IDAT(zlib) + IEND），
 * 这样仓库里不需要引入 sharp / canvas 这类重依赖。
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public')
mkdirSync(OUT_DIR, { recursive: true })

/* ------------------------------ PNG 编码 ------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function encodePng(width, height, rgba) {
  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0 // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------ 图标绘制 ------------------------------ */

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a, b, t) => a + (b - a) * t
const smooth = (edge0, edge1, x) => {
  const t = clamp01((x - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

/** 点到线段距离 */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const len2 = dx * dx + dy * dy
  const t = len2 === 0 ? 0 : clamp01(((px - ax) * dx + (py - ay) * dy) / len2)
  const cx = ax + t * dx
  const cy = ay + t * dy
  return Math.hypot(px - cx, py - cy)
}

function pointInTriangle(px, py, a, b, c) {
  const sign = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1])
  const d1 = sign([px, py], a, b)
  const d2 = sign([px, py], b, c)
  const d3 = sign([px, py], c, a)
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0
  return !(hasNeg && hasPos)
}

/**
 * 绘制一个图标
 * @param {number} size 边长
 * @param {boolean} rounded 是否圆角（maskable / apple 图标用直角满幅）
 * @param {number} contentScale 内容缩放（maskable 需要留出安全区）
 */
function drawIcon(size, rounded = true, contentScale = 1) {
  const rgba = Buffer.alloc(size * size * 4)
  const R = size / 2
  const radius = rounded ? size * 0.225 : 0

  // 水滴几何：圆心放在"让水滴整体垂直居中"的位置
  const cSize = size * contentScale
  const dropR = cSize * 0.208
  const dropC = [size / 2, size / 2 + dropR * 0.81]
  const apex = [size / 2, dropC[1] - dropR * 2.62]

  // 顶点到圆的切线
  const d = Math.hypot(apex[0] - dropC[0], apex[1] - dropC[1])
  const theta = Math.acos(dropR / d)
  const base = Math.atan2(apex[1] - dropC[1], apex[0] - dropC[0])
  const t1 = [dropC[0] + dropR * Math.cos(base + theta), dropC[1] + dropR * Math.sin(base + theta)]
  const t2 = [dropC[0] + dropR * Math.cos(base - theta), dropC[1] + dropR * Math.sin(base - theta)]

  const SS = 3 // 3x3 超采样抗锯齿
  const samples = []
  for (let sy = 0; sy < SS; sy++) {
    for (let sx = 0; sx < SS; sx++) {
      samples.push([(sx + 0.5) / SS, (sy + 0.5) / SS])
    }
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let bgA = 0
      let dropA = 0
      let r = 0
      let g = 0
      let b = 0

      for (const [ox, oy] of samples) {
        const px = x + ox
        const py = y + oy

        // 圆角矩形覆盖率（rounded=false 时就是满幅 1）
        let inBg = 1
        if (radius > 0) {
          const half = (size - radius * 2) / 2
          const qx = Math.abs(px - R) - half
          const qy = Math.abs(py - R) - half
          const dist = Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius
          inBg = smooth(0.75, -0.75, dist)
        }
        bgA += inBg

        // 135° 渐变背景（靛蓝 → 青）
        const t = clamp01((px / size) * 0.5 + (py / size) * 0.5)
        r += lerp(0x63, 0x06, t)
        g += lerp(0x66, 0xb6, t)
        b += lerp(0xf1, 0xd4, t)

        // 水滴 = 圆 ∪ 切线三角
        const inCircle = dropR - Math.hypot(px - dropC[0], py - dropC[1])
        const inTri = pointInTriangle(px, py, apex, t1, t2) ? 1 : 0
        dropA += Math.max(smooth(-0.8, 0.8, inCircle), inTri)
      }

      const n = samples.length
      const alpha = clamp01(bgA / n)
      const dropCoverage = clamp01(dropA / n)

      r /= n
      g /= n
      b /= n
      // 水滴画成接近纯白
      r = lerp(r, 252, dropCoverage)
      g = lerp(g, 252, dropCoverage)
      b = lerp(b, 255, dropCoverage)

      const i = (y * size + x) * 4
      rgba[i] = Math.round(clamp01(r / 255) * 255)
      rgba[i + 1] = Math.round(clamp01(g / 255) * 255)
      rgba[i + 2] = Math.round(clamp01(b / 255) * 255)
      rgba[i + 3] = Math.round(alpha * 255)
    }
  }
  return encodePng(size, size, rgba)
}

/** 用系统字体渲染 SVG 版本 favicon 时不需要 PNG，这里单独写文件 */
const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#6366f1"/>
      <stop offset="1" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="64" height="64" rx="15" fill="url(#g)"/>
  <path d="M32 12c0 0-13 15.4-13 24.2a13 13 0 0 0 26 0C45 27.4 32 12 32 12Z" fill="#fff" fill-opacity=".95"/>
</svg>
`

const targets = [
  ['pwa-192x192.png', 192, true, 1],
  ['pwa-512x512.png', 512, true, 1],
  ['pwa-maskable-512x512.png', 512, false, 0.68],
  ['apple-touch-icon.png', 180, false, 0.86],
  ['favicon-32x32.png', 32, true, 1],
]

for (const [name, size, rounded, scale] of targets) {
  writeFileSync(join(OUT_DIR, name), drawIcon(size, rounded, scale))
  console.log(`✓ public/${name}  (${size}×${size})`)
}
writeFileSync(join(OUT_DIR, 'favicon.svg'), FAVICON_SVG, 'utf8')
console.log('✓ public/favicon.svg')
writeFileSync(join(OUT_DIR, '.nojekyll'), '', 'utf8')
console.log('✓ public/.nojekyll')
