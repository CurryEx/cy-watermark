/** 水印设置状态（模块级单例，带 localStorage 持久化 + 预设管理） */
import { reactive, watch } from 'vue'
import {
  DEFAULT_SETTINGS,
  PRESETS_KEY,
  SETTINGS_KEY,
  BUILTIN_PRESETS,
} from '../config/defaults.js'

const clean = (obj) => {
  const out = {}
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    if (obj && obj[k] !== undefined) out[k] = obj[k]
  }
  return out
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return clean(JSON.parse(raw))
  } catch {
    /* ignore */
  }
  return {}
}

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    if (raw) {
      const list = JSON.parse(raw)
      if (Array.isArray(list)) return list
    }
  } catch {
    /* ignore */
  }
  return []
}

export const settings = reactive({ ...DEFAULT_SETTINGS, ...loadSettings() })

/** 用户自定义预设 [{ id, name, settings, builtin }] */
export const presets = reactive([
  ...BUILTIN_PRESETS.map((p, i) => ({ id: `builtin-${i}`, builtin: true, ...p })),
  ...loadPresets(),
])

let persistTimer = null
watch(
  settings,
  () => {
    if (persistTimer) return
    persistTimer = setTimeout(() => {
      persistTimer = null
      try {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean(settings)))
      } catch {
        /* ignore */
      }
    }, 400)
  },
  { deep: true },
)

function persistPresets() {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets.filter((p) => !p.builtin)))
  } catch {
    /* ignore */
  }
}

/** 应用一组参数（预设 / 快捷模板）：绝不改动水印文字 */
export function applySettings(patch) {
  const next = clean(patch)
  delete next.text
  Object.assign(settings, next)
}

export function savePreset(name) {
  const saved = clean(settings)
  delete saved.text // 预设只记参数，不记文字
  const preset = { id: `p-${Date.now()}`, name: name.trim(), settings: saved }
  presets.push(preset)
  persistPresets()
  return preset
}

export function deletePreset(id) {
  const i = presets.findIndex((p) => p.id === id)
  if (i >= 0 && !presets[i].builtin) {
    presets.splice(i, 1)
    persistPresets()
  }
}
