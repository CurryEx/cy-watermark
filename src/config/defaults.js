/** 默认水印设置、字体选项、预设 */

// v2：删除了自动字号 / 行高 / 边缘留白 / 三色渐变 / 阴影不透明度，
// 并调整了默认文字与字号，因此换一个 key 让所有人拿到新的默认参数。
export const SETTINGS_KEY = 'cy-watermark:settings:v2'
export const PRESETS_KEY = 'cy-watermark:presets:v1'
export const THEME_KEY = 'cy-watermark:theme'

export const FONT_OPTIONS = [
  { label: '系统默认（推荐）', value: '"PingFang SC","Microsoft YaHei","Helvetica Neue",Arial,sans-serif' },
  { label: '黑体 / 无衬线', value: '"Microsoft YaHei","PingFang SC","Noto Sans SC",Arial,sans-serif' },
  { label: '宋体 / 衬线', value: 'SimSun,"Songti SC","Noto Serif SC",Georgia,serif' },
  { label: '楷体', value: 'KaiTi,"Kaiti SC",STKaiti,"Noto Serif SC",serif' },
  { label: '等宽', value: '"JetBrains Mono",Consolas,"Courier New",monospace' },
  { label: 'Impact（海报感）', value: 'Impact,"Arial Black",sans-serif' },
  { label: 'Georgia', value: 'Georgia,"Times New Roman",serif' },
  { label: '手写体', value: '"Segoe Script","Bradley Hand","Comic Sans MS",cursive' },
]

export const POSITION_OPTIONS = [
  { label: '左上', value: 'top-left' },
  { label: '上中', value: 'top-center' },
  { label: '右上', value: 'top-right' },
  { label: '左中', value: 'middle-left' },
  { label: '正中', value: 'center' },
  { label: '右中', value: 'middle-right' },
  { label: '左下', value: 'bottom-left' },
  { label: '下中', value: 'bottom-center' },
  { label: '右下', value: 'bottom-right' },
]

/**
 * 自动推导 GitHub 仓库地址（用于页头"查看源码"按钮）
 * - 优先使用构建时注入的 VITE_REPO_URL
 * - 否则从 *.github.io 域名 + 路径首段推导（GitHub Pages 项目页）
 */
export function resolveRepoUrl() {
  const envUrl = import.meta.env?.VITE_REPO_URL
  if (envUrl) return envUrl
  if (typeof location === 'undefined') return ''
  const m = /^([^.]+)\.github\.io$/i.exec(location.hostname)
  if (!m) return ''
  const seg = location.pathname.split('/').filter(Boolean)[0]
  return seg ? `https://github.com/${m[1]}/${seg}` : `https://github.com/${m[1]}`
}

export const DEFAULT_SETTINGS = {
  /* ---------------- 水印内容 ---------------- */
  enabled: true,
  type: 'text', // text | image
  text: '仅用于XX业务',
  fontFamily: FONT_OPTIONS[0].value,
  fontSize: 2, // 占图片宽度的百分比
  bold: true,
  italic: false,
  letterSpacing: 0, // em
  strokeEnabled: false,
  strokeWidth: 0.14, // 相对字号
  strokeColor: '#000000',
  shadowEnabled: false,
  shadowBlur: 25, // 相对字号 %
  shadowColor: '#000000',

  /* ---------------- 图片水印 ---------------- */
  logoScale: 12, // 占图片宽度百分比

  /* ---------------- 排布 ---------------- */
  layout: 'tile', // tile | single
  angle: -30, // -90 ~ 90
  densityX: 3, // 水平密度：横向重复个数
  densityY: 6, // 垂直密度：纵向重复个数
  offsetAlternate: true, // 隔行错位（砖块式）
  jitter: 0, // 位置抖动 %
  jitterRotate: 0, // 角度抖动 ±°
  jitterSeed: 20260924,
  position: 'bottom-right',
  singleAngle: 0,
  positionMargin: 3, // 单个模式边距 %（相对短边）

  /* ---------------- 颜色 ---------------- */
  colorMode: 'solid', // solid | gradient
  color: '#ffffff',
  gradientFrom: '#ff7a18',
  gradientTo: '#00d4ff',
  gradientAngle: 45,
  opacity: 30, // 0 - 100

  /* ---------------- 导出 ---------------- */
  format: 'jpeg', // jpeg | png | webp
  quality: 92,
  maxSize: 0, // 0 = 保持原始尺寸
  keepExif: false,
  jpegBackground: '#ffffff',
  filenamePattern: '{name}-watermark',
  zipName: 'watermarked-{date}-{time}',
}

export const BUILTIN_PRESETS = [
  {
    name: '默认',
    desc: '经典斜纹平铺',
    settings: {
      layout: 'tile',
      angle: -30,
      densityX: 3,
      densityY: 6,
      offsetAlternate: true,
      fontSize: 2,
      colorMode: 'solid',
      color: '#ffffff',
      opacity: 30,
      strokeEnabled: false,
      shadowEnabled: false,
    },
  },
  {
    name: '较密',
    desc: '覆盖更密，遮挡更强',
    settings: {
      layout: 'tile',
      angle: -30,
      densityX: 5,
      densityY: 11,
      offsetAlternate: true,
      fontSize: 1.4,
      colorMode: 'solid',
      color: '#ffffff',
      opacity: 26,
      strokeEnabled: false,
      shadowEnabled: false,
    },
  },
  {
    name: '防p图',
    desc: '渐变 + 描边 + 投影',
    settings: {
      layout: 'tile',
      angle: -30,
      densityX: 3,
      densityY: 7,
      offsetAlternate: true,
      fontSize: 2,
      colorMode: 'gradient',
      gradientFrom: '#ff7a18',
      gradientTo: '#00d4ff',
      gradientAngle: 45,
      opacity: 25,
      strokeEnabled: true,
      strokeColor: '#000000',
      strokeWidth: 0.1,
      shadowEnabled: true,
      shadowColor: '#1677ff',
      shadowBlur: 20,
    },
  },
  {
    name: '右下',
    desc: '角落单个签名',
    settings: {
      layout: 'single',
      position: 'bottom-right',
      singleAngle: 0,
      positionMargin: 3,
      fontSize: 2.5,
      colorMode: 'solid',
      color: '#ffffff',
      opacity: 80,
      strokeEnabled: false,
      shadowEnabled: true,
      shadowColor: '#000000',
      shadowBlur: 30,
    },
  },
]
