/**
 * 水印绘制核心引擎（与 UI 框架无关，纯 canvas 逻辑）
 *
 * 设计要点：
 * 1. 所有尺寸都是"相对尺寸"（按图片宽高的百分比换算），因此预览（缩小渲染）与
 *    导出（原始尺寸渲染）的结果完全一致。
 * 2. 排布算法在"旋转后的坐标系"里构建点阵：先把画布绕中心旋转，再铺网格，
 *    最后把每个点逆变换回图片坐标绘制 —— 这样无论角度多少，水印之间的
 *    水平 / 垂直间距都保持均匀。
 * 3. 抖动使用确定性随机（mulberry32），拖动任何滑块都不会让水印"乱跳"。
 */
import { clamp, deg2rad, mulberry32 } from './math.js'

/* ------------------------------------------------------------------ *
 * 度量
 * ------------------------------------------------------------------ */

let _measureCtx = null
/** 复用的离屏 2d context，仅用于 measureText，不参与绘制 */
export function getMeasureCtx() {
  if (!_measureCtx) {
    const c = document.createElement('canvas')
    c.width = c.height = 8
    _measureCtx = c.getContext('2d')
  }
  return _measureCtx
}

export function fontString(s, px) {
  const style = s.italic ? 'italic' : 'normal'
  const weight = s.bold ? '700' : '400'
  return `${style} ${weight} ${px}px ${s.fontFamily}`
}

export function supportsLetterSpacing() {
  return (
    typeof CanvasRenderingContext2D !== 'undefined' &&
    'letterSpacing' in CanvasRenderingContext2D.prototype
  )
}

function applyLetterSpacing(ctx, s, fontPx) {
  if (!supportsLetterSpacing()) return
  const em = Number(s.letterSpacing) || 0
  ctx.letterSpacing = `${em * fontPx}px`
}

/** 用给定字号量一下文本（返回每行宽度） */
export function measureLines(ctx, s, fontPx) {
  const lines = String(s.text ?? '').split('\n')
  ctx.save()
  ctx.font = fontString(s, fontPx)
  applyLetterSpacing(ctx, s, fontPx)
  const widths = lines.map((l) => {
    const w = ctx.measureText(l || ' ').width
    return Number.isFinite(w) && w > 0 ? w : fontPx * 0.6
  })
  ctx.restore()
  return { lines, widths, maxWidth: Math.max(...widths, 1) }
}

/** 多行文字的行高（固定值，不再对外暴露设置） */
const LINE_HEIGHT = 1.25

/**
 * 由图片尺寸 + 设置推导出实际绘制参数
 * @returns {{stepX:number, stepY:number, fontPx:number, textWidth:number}}
 */
export function resolveMetrics(w, h, s) {
  const densityX = Math.max(1, Number(s.densityX) || 1)
  const densityY = Math.max(1, Number(s.densityY) || 1)
  const stepX = w / densityX
  const stepY = h / densityY

  let fontPx = 0
  let textWidth = 0

  if (s.type === 'text') {
    const ctx = getMeasureCtx()
    fontPx = w * ((Number(s.fontSize) || 2) / 100)
    textWidth = measureLines(ctx, s, fontPx).maxWidth
    const softMax = Math.max(w, h) * 0.4
    fontPx = clamp(fontPx, 4, softMax)
    textWidth = (textWidth / (fontPx || 1)) * fontPx
  }

  return { stepX, stepY, fontPx, textWidth }
}

/* ------------------------------------------------------------------ *
 * 填充（纯色 / 渐变）
 * ------------------------------------------------------------------ */

/**
 * 生成一个水印实例的填充色。
 * 渐变以「单个水印自身的包围盒」为单位建立，并工作在实例的局部坐标系上
 * （调用前已经 translate 到水印中心）—— 否则用整图渐变的话，
 * 单个小水印只会取到其中一色，看上去就像是纯色。
 */
function makeInstanceFill(ctx, s, width, height) {
  if (s.colorMode !== 'gradient') return s.color
  const a = deg2rad(s.gradientAngle)
  const len = Math.max(1, Math.abs(width * Math.cos(a)) + Math.abs(height * Math.sin(a)))
  const dx = (Math.cos(a) * len) / 2
  const dy = (Math.sin(a) * len) / 2
  const g = ctx.createLinearGradient(-dx, -dy, dx, dy)
  g.addColorStop(0, s.gradientFrom)
  g.addColorStop(1, s.gradientTo)
  return g
}

/* ------------------------------------------------------------------ *
 * 单个水印实例
 * ------------------------------------------------------------------ */

function drawTextInstance(ctx, s, metrics) {
  const fontPx = metrics.fontPx
  ctx.font = fontString(s, fontPx)
  applyLetterSpacing(ctx, s, fontPx)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const lines = String(s.text ?? '').split('\n')
  const lh = fontPx * LINE_HEIGHT
  const offset = ((lines.length - 1) * lh) / 2

  ctx.fillStyle = makeInstanceFill(
    ctx,
    s,
    Math.max(1, metrics.textWidth),
    Math.max(1, lh * lines.length),
  )

  if (s.strokeEnabled && s.strokeWidth > 0) {
    ctx.lineWidth = Math.max(1, fontPx * s.strokeWidth)
    ctx.strokeStyle = s.strokeColor
    ctx.lineJoin = 'round'
    ctx.miterLimit = 2
  }

  lines.forEach((line, i) => {
    const y = i * lh - offset
    if (s.strokeEnabled && s.strokeWidth > 0) ctx.strokeText(line, 0, y)
    ctx.fillText(line, 0, y)
  })
}

function drawLogoInstance(ctx, w, s, logo) {
  if (!logo) return
  const lw = w * ((Number(s.logoScale) || 10) / 100)
  const lh = lw * (logo.height / logo.width || 1)
  ctx.drawImage(logo, -lw / 2, -lh / 2, lw, lh)
}

/* ------------------------------------------------------------------ *
 * 位置（单个模式）
 * ------------------------------------------------------------------ */

const POS_ALIGN = {
  'top-left': [0, 0],
  'top-center': [0.5, 0],
  'top-right': [1, 0],
  'middle-left': [0, 0.5],
  center: [0.5, 0.5],
  'middle-right': [1, 0.5],
  'bottom-left': [0, 1],
  'bottom-center': [0.5, 1],
  'bottom-right': [1, 1],
}

/** 水印中心点需要相对图片边缘缩进多少（考虑水印自身尺寸，避免越界） */
function singleAnchor(w, h, s, metrics, logo) {
  const m = (Number(s.positionMargin) || 3) / 100 * Math.min(w, h)
  let halfW = metrics.textWidth / 2
  let halfH = (metrics.fontPx * LINE_HEIGHT * String(s.text ?? '').split('\n').length) / 2
  if (s.type === 'image' && logo) {
    halfW = (w * (Number(s.logoScale) || 10)) / 200
    halfH = halfW * (logo.height / logo.width || 1)
  }
  const ang = Math.abs(deg2rad(s.singleAngle || 0))
  // 旋转后的包围盒（保守估算）
  const bw = Math.abs(halfW * Math.cos(ang)) + Math.abs(halfH * Math.sin(ang))
  const bh = Math.abs(halfW * Math.sin(ang)) + Math.abs(halfH * Math.cos(ang))
  return { m, halfW: bw, halfH: bh }
}

/* ------------------------------------------------------------------ *
 * 主入口
 * ------------------------------------------------------------------ */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w  目标画布宽
 * @param {number} h  目标画布高
 * @param {object} s  设置对象
 * @param {{logo?: ImageBitmap|HTMLImageElement|null}} opts
 */
export function drawWatermark(ctx, w, h, s, opts = {}) {
  if (!s || s.enabled === false) return
  const logo = opts.logo || null

  if (s.type === 'text' && !String(s.text ?? '').trim()) return
  if (s.type === 'image' && !logo) return

  const alpha = clamp((Number(s.opacity) || 0) / 100, 0, 1)
  if (alpha <= 0) return

  const metrics = resolveMetrics(w, h, s)

  ctx.save()
  ctx.globalAlpha *= alpha

  // 阴影的颜色/透明度都跟随整体不透明度（globalAlpha 会一并作用于阴影）
  if (s.shadowEnabled) {
    const base = metrics.fontPx || Math.min(w, h) * 0.02
    ctx.shadowColor = s.shadowColor || '#000000'
    ctx.shadowBlur = base * ((Number(s.shadowBlur) || 20) / 100)
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
  }

  const drawInstance = (px, py, rot) => {
    ctx.save()
    ctx.translate(px, py)
    ctx.rotate(rot)
    if (s.type === 'image') drawLogoInstance(ctx, w, s, logo)
    else drawTextInstance(ctx, s, metrics)
    ctx.restore()
  }

  if (s.layout === 'single') {
    const { m, halfW, halfH } = singleAnchor(w, h, s, metrics, logo)
    const [ax, ay] = POS_ALIGN[s.position] || POS_ALIGN['bottom-right']
    const marginX = m + halfW + Math.max(0, m - halfH) * 0
    const marginY = m + halfH
    const px = clamp(ax * w, marginX, w - marginX)
    const py = clamp(ay * h, marginY, h - marginY)
    drawInstance(px, py, deg2rad(s.singleAngle || 0))
  } else {
    drawTiled(ctx, w, h, s, metrics, drawInstance)
  }

  ctx.restore()
}

/** 阵列平铺 */
function drawTiled(ctx, w, h, s, metrics, drawInstance) {
  const { stepX, stepY } = metrics
  const cx = w / 2
  const cy = h / 2
  const ang = deg2rad(s.angle || 0)
  const cos = Math.cos(ang)
  const sin = Math.sin(ang)

  // 旋转后需要覆盖的对角线长度
  const D = Math.hypot(w, h)
  const cols = Math.max(1, Math.ceil(D / stepX) + 1)
  const rows = Math.max(1, Math.ceil(D / stepY) + 1)
  const startX = -((cols - 1) * stepX) / 2
  const startY = -((rows - 1) * stepY) / 2

  const jitterX = ((Number(s.jitter) || 0) / 100) * stepX
  const jitterY = ((Number(s.jitter) || 0) / 100) * stepY
  const jitterRot = Number(s.jitterRotate) || 0
  const rnd = mulberry32(Number(s.jitterSeed) || 20260924)

  for (let j = 0; j < rows; j++) {
    const rowShift = s.offsetAlternate && j % 2 === 1 ? stepX / 2 : 0
    for (let i = 0; i < cols; i++) {
      // 注意：随机数必须"无论是否跳过都消费"，否则图案会随密度变化而错乱
      const ox = jitterX > 0 ? (rnd() * 2 - 1) * jitterX : 0
      const oy = jitterY > 0 ? (rnd() * 2 - 1) * jitterY : 0
      const rot = jitterRot > 0 ? deg2rad((rnd() * 2 - 1) * jitterRot) : 0

      const rx = startX + i * stepX + rowShift + ox
      const ry = startY + j * stepY + oy

      // 旋回图片坐标系
      const px = cx + rx * cos - ry * sin
      const py = cy + rx * sin + ry * cos

      // 超出画布就跳过（画不到，省性能）
      if (px < 0 || px > w || py < 0 || py > h) continue

      drawInstance(px, py, ang + rot)
    }
  }
}

