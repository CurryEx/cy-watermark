/** 通用数学 / 小工具 */

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

export const deg2rad = (deg) => ((deg || 0) * Math.PI) / 180

/** 确定性伪随机数（同一 seed 永远产生同一序列）——保证水印抖动不会闪动 */
export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** 判断颜色是否为浅色（用于自动描边的对比色） */
export function isLightColor(hex) {
  let h = String(hex || '#fff').replace('#', '')
  if (h.length === 3) h = h.split('').map((c) => c + c).join('')
  if (h.length !== 6) return true
  const n = parseInt(h, 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  // 相对亮度（简化版 YIQ）
  return (r * 299 + g * 587 + b * 114) / 1000 >= 140
}

/** 数字保留小数（避免 0.30000000000000004 这种脏值） */
export const round = (v, digits = 2) => {
  const p = 10 ** digits
  return Math.round(v * p) / p
}
