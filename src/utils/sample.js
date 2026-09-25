/**
 * 示例图片：程序生成的「动画风格」虚拟身份证（卡通证件）
 *
 * - 完全虚构：卡通人物 + 虚构信息，仅用于快速体验水印效果
 * - 卡通人像来自 `public/samples/portrait.png`（透明底），加载失败时退化为剪影
 * - 全程本地 canvas 绘制，不联网
 */

// 卡片按这个「逻辑尺寸」绘制，再整体居中放到更大的画布上（四周留白，像一张照片）
const CARD_W = 1800
const CARD_H = 1140
const CANVAS_W = 2140
const CANVAS_H = 1520

const FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC","Heiti SC",sans-serif'
const INK = '#16202e' // 卡通描边
const LABEL = '#2a6bb5' // 字段名
const VALUE = '#111820' // 字段值

/* ---------------------------------- 工具 ---------------------------------- */

/** 圆角矩形路径（不依赖 ctx.roundRect 的浏览器支持） */
function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.lineTo(x + w - rr, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr)
  ctx.lineTo(x + w, y + h - rr)
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h)
  ctx.lineTo(x + rr, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr)
  ctx.lineTo(x, y + rr)
  ctx.quadraticCurveTo(x, y, x + rr, y)
  ctx.closePath()
}

/** 逐字绘制（自带字间距，兼容不支持 letterSpacing 的浏览器） */
function drawTracked(ctx, text, x, y, tracking) {
  let cx = x
  for (const ch of text) {
    ctx.fillText(ch, cx, y)
    cx += ctx.measureText(ch).width + tracking
  }
}

/** 四角星（漫画闪光） */
function drawSparkle(ctx, cx, cy, r, color) {
  ctx.save()
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(cx, cy - r)
  ctx.quadraticCurveTo(cx + r * 0.2, cy - r * 0.2, cx + r, cy)
  ctx.quadraticCurveTo(cx + r * 0.2, cy + r * 0.2, cx, cy + r)
  ctx.quadraticCurveTo(cx - r * 0.2, cy + r * 0.2, cx - r, cy)
  ctx.quadraticCurveTo(cx - r * 0.2, cy - r * 0.2, cx, cy - r)
  ctx.fill()
  ctx.restore()
}

/** 卡通云朵 */
function drawCloud(ctx, x, y, cw, fill, stroke, lineWidth) {
  const ch = cw * 0.5
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y + ch)
  ctx.bezierCurveTo(x - cw * 0.08, y + ch * 0.3, x + cw * 0.1, y - ch * 0.2, x + cw * 0.32, y + ch * 0.1)
  ctx.bezierCurveTo(x + cw * 0.36, y - ch * 0.5, x + cw * 0.76, y - ch * 0.45, x + cw * 0.78, y + ch * 0.14)
  ctx.bezierCurveTo(x + cw * 1.02, y, x + cw * 1.08, y + ch * 0.55, x + cw * 0.98, y + ch)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.lineJoin = 'round'
    ctx.lineWidth = lineWidth
    ctx.strokeStyle = stroke
    ctx.stroke()
  }
  ctx.restore()
}

/** 底纹：波纹线 */
function drawWaves(ctx, x, y, w, h, rows, color) {
  ctx.save()
  ctx.strokeStyle = color
  ctx.lineWidth = 2
  for (let i = 0; i < rows; i++) {
    const baseY = y + (h * (i + 0.5)) / rows
    ctx.beginPath()
    for (let px = 0; px <= w; px += 8) {
      const t = px / w
      const py = baseY + Math.sin(t * Math.PI * 6 + i * 0.9) * h * 0.04
      if (px === 0) ctx.moveTo(x + px, py)
      else ctx.lineTo(x + px, py)
    }
    ctx.stroke()
  }
  ctx.restore()
}

/** 底纹：网点 */
function drawDots(ctx, x, y, w, h, step, r, color) {
  ctx.save()
  ctx.fillStyle = color
  for (let py = y; py < y + h; py += step) {
    for (let px = x; px < x + w; px += step) {
      ctx.beginPath()
      ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.restore()
}

/* ---------------------------------- 主流程 ---------------------------------- */

/** 加载卡通人像（失败返回 null） */
async function loadPortrait() {
  try {
    const base = import.meta.env?.BASE_URL || '/'
    const img = new Image()
    img.src = `${base}samples/portrait.png`
    if (img.decode) await img.decode()
    else await new Promise((res, rej) => ((img.onload = res), (img.onerror = rej)))
    return img
  } catch {
    return null
  }
}

function drawCardBase(ctx, x, y, w, h) {
  // 卡片投影
  ctx.save()
  ctx.shadowColor = 'rgba(24,38,72,0.30)'
  ctx.shadowBlur = 34
  ctx.shadowOffsetY = 14
  ctx.fillStyle = '#ffffff'
  roundRect(ctx, x, y, w, h, 34)
  ctx.fill()
  ctx.restore()

  ctx.save()
  roundRect(ctx, x, y, w, h, 34)
  ctx.clip()

  const g = ctx.createLinearGradient(x, y, x + w, y + h)
  g.addColorStop(0, '#e8f2ff')
  g.addColorStop(0.45, '#fbfdff')
  g.addColorStop(1, '#ffeef2')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)

  // 暗纹
  drawWaves(ctx, x + 40, y + h * 0.5, w - 80, h * 0.42, 6, 'rgba(70,130,200,0.085)')
  ctx.save()
  ctx.strokeStyle = 'rgba(70,130,200,0.07)'
  ctx.lineWidth = 2
  for (let i = 0; i < 7; i++) {
    ctx.beginPath()
    ctx.arc(x + w * 0.04, y + h * 1.02, h * (0.3 + i * 0.11), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
  drawDots(ctx, x + w - 470, y + 26, 440, 300, 22, 2.2, 'rgba(255,150,70,0.10)')
  ctx.restore()
}

function drawHeader(ctx, x, y, w) {
  ctx.save()
  ctx.fillStyle = INK
  ctx.font = `700 76px ${FONT}`
  drawTracked(ctx, '居民身份证', x + 104, y + 200, 12)
  ctx.restore()

  // 标题下的分隔线
  ctx.save()
  const lg = ctx.createLinearGradient(x + 104, 0, x + w * 0.46, 0)
  lg.addColorStop(0, 'rgba(60,110,180,0.30)')
  lg.addColorStop(1, 'rgba(60,110,180,0)')
  ctx.fillStyle = lg
  ctx.fillRect(x + 104, y + 244, w * 0.32, 3)
  ctx.restore()

  // 漫画小闪光
  drawSparkle(ctx, x + 660, y + 140, 26, 'rgba(255,186,60,0.9)')
  drawSparkle(ctx, x + 752, y + 224, 15, 'rgba(255,186,60,0.65)')
}

function drawPhoto(ctx, x, y, w, h, portrait) {
  const pw = 470
  const ph = 566
  const px = x + w - 62 - pw
  const py = y + 92

  ctx.save()
  roundRect(ctx, px, py, pw, ph, 14)
  ctx.clip()

  // 天空底（证件照背景）
  const sky = ctx.createLinearGradient(0, py, 0, py + ph)
  sky.addColorStop(0, '#bfe0ff')
  sky.addColorStop(0.55, '#e9f5ff')
  sky.addColorStop(1, '#fdf0dc')
  ctx.fillStyle = sky
  ctx.fillRect(px, py, pw, ph)

  drawCloud(ctx, px + 36, py + 132, 220, '#ffffff', 'rgba(22,32,46,0.7)', 5)
  drawCloud(ctx, px + 258, py + 52, 170, '#ffffff', 'rgba(22,32,46,0.5)', 4)

  if (portrait && portrait.width) {
    const s = Math.min(pw / portrait.width, ph / portrait.height)
    const dw = portrait.width * s
    const dh = portrait.height * s
    ctx.drawImage(portrait, px + (pw - dw) / 2, py + ph - dh - ph * 0.02, dw, dh)
  } else {
    // 加载失败时的剪影兜底
    ctx.fillStyle = '#b9c8dd'
    ctx.beginPath()
    ctx.arc(px + pw / 2, py + ph * 0.36, pw * 0.2, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(px + pw / 2, py + ph * 1.04, pw * 0.4, ph * 0.32, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  drawSparkle(ctx, px + 46, py + 46, 20, 'rgba(255,255,255,0.95)')
  ctx.restore()

  // 卡通描边
  ctx.save()
  ctx.shadowColor = 'rgba(24,38,72,0.22)'
  ctx.shadowBlur = 16
  ctx.shadowOffsetY = 6
  ctx.lineJoin = 'round'
  ctx.lineWidth = 8
  ctx.strokeStyle = INK
  roundRect(ctx, px, py, pw, ph, 14)
  ctx.stroke()
  ctx.restore()
}

function drawFields(ctx, x, y) {
  const left = x + 104
  const valX = left + 190

  const label = (text, lx, ly) => {
    ctx.save()
    ctx.fillStyle = LABEL
    ctx.font = `500 27px ${FONT}`
    ctx.fillText(text, lx, ly)
    ctx.restore()
  }
  const value = (text, vx, vy, size, tracking = 0) => {
    ctx.save()
    ctx.fillStyle = VALUE
    ctx.font = `700 ${size}px ${FONT}`
    if (tracking) drawTracked(ctx, text, vx, vy, tracking)
    else ctx.fillText(text, vx, vy)
    ctx.restore()
  }

  label('姓\u3000名', left, y + 420)
  value('蛋小卷', valX, y + 438, 58)

  label('性\u3000别', left, y + 560)
  value('男', valX, y + 576, 46)
  label('民\u3000族', valX + 300, y + 560)
  value('汉', valX + 490, y + 576, 46)

  label('出\u3000生', left, y + 700)
  value('反正是个老登', valX, y + 716, 46)

  label('住\u3000址', left, y + 840)
  value('银河系 太阳系 地月系 地球 中国', valX, y + 856, 42)

  label('公民身份号码', left, y + 1000)
  value('1145141919810', valX, y + 1006, 50, 10)
}

function drawCardBorder(ctx, x, y, w, h) {
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineWidth = 10
  ctx.strokeStyle = INK
  roundRect(ctx, x, y, w, h, 34)
  ctx.stroke()

  ctx.lineWidth = 3
  ctx.strokeStyle = 'rgba(22,32,46,0.20)'
  roundRect(ctx, x + 15, y + 15, w - 30, h - 30, 24)
  ctx.stroke()
  ctx.restore()
}

/**
 * 全局调色：整体压暗 + 提灰。
 * 示例图本身太亮太艳的话，默认的白色水印会几乎看不见，
 * 反而让人以为水印没生效（这里把亮度和饱和度都往下拉一档）。
 */
function applyGrade(ctx, w, h) {
  const BRIGHT = 0.8
  const SAT = 0.48
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    const gray = 0.299 * r + 0.587 * g + 0.114 * b
    const nr = (gray + (r - gray) * SAT) * BRIGHT
    const ng = (gray + (g - gray) * SAT) * BRIGHT
    const nb = (gray + (b - gray) * SAT) * BRIGHT
    d[i] = nr < 0 ? 0 : nr > 255 ? 255 : nr
    d[i + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng
    d[i + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb
  }
  ctx.putImageData(img, 0, 0)
}

/** 卡片四周的背景（柔和的桌面感渐变色 + 暗角） */
function drawBackdrop(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#dbe3ee')
  g.addColorStop(0.5, '#b9c4d3')
  g.addColorStop(1, '#8f9daf')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  const v = ctx.createRadialGradient(
    w / 2,
    h / 2,
    Math.min(w, h) * 0.28,
    w / 2,
    h / 2,
    Math.hypot(w, h) / 2,
  )
  v.addColorStop(0, 'rgba(0,0,0,0)')
  v.addColorStop(1, 'rgba(24,34,52,0.34)')
  ctx.fillStyle = v
  ctx.fillRect(0, 0, w, h)
}

/**
 * 生成一张虚拟身份证示例图
 * @returns {Promise<File>} PNG 文件
 */
export async function createSampleIdCard() {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')

  drawBackdrop(ctx, CANVAS_W, CANVAS_H)

  // 卡片居中放置，四周留出空白（看起来像照片，而不是“一整张糊脸”）
  const ox = Math.round((CANVAS_W - CARD_W) / 2)
  const oy = Math.round((CANVAS_H - CARD_H) / 2)
  const portrait = await loadPortrait()

  ctx.save()
  ctx.translate(ox, oy)
  drawCardBase(ctx, 0, 0, CARD_W, CARD_H)
  drawPhoto(ctx, 0, 0, CARD_W, CARD_H, portrait)
  drawHeader(ctx, 0, 0, CARD_W)
  drawFields(ctx, 0, 0)
  drawCardBorder(ctx, 0, 0, CARD_W, CARD_H)
  ctx.restore()

  applyGrade(ctx, CANVAS_W, CANVAS_H)

  const blob = await new Promise((res) => canvas.toBlob(res, 'image/png'))
  return new File([blob], 'demo-idcard.png', { type: 'image/png' })
}
