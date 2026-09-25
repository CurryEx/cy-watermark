<script setup>
import { computed } from 'vue'

/**
 * 颜色选择器（ant-design-vue 4.x 并没有 ColorPicker 组件，这里自绘一个）
 * - 左：原生取色器，渲染成圆角色块
 * - 右：十六进制输入框，可手填
 * - 下：常用色快选
 */
const value = defineModel('value', { default: '#ffffff' })

defineProps({
  label: { type: String, default: '' },
  tip: { type: String, default: '' },
  swatches: { type: Array, default: () => [] },
})

const HEX_RE = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

/** 规范成 #rrggbb，供原生 input[type=color] 使用 */
const normalized = computed(() => {
  let h = String(value.value || '').trim()
  if (!h.startsWith('#')) h = `#${h}`
  if (/^#[0-9a-f]{3}$/i.test(h)) {
    h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`
  }
  return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : '#ffffff'
})

function onNative(e) {
  value.value = e.target.value
}

function onHex(e) {
  const raw = e.target.value.trim()
  if (!HEX_RE.test(raw)) return
  value.value = raw.startsWith('#') ? raw.toLowerCase() : `#${raw.toLowerCase()}`
}

function same(a, b) {
  const n = (v = '') => {
    let h = String(v).trim().toLowerCase()
    return h.startsWith('#') ? h : `#${h}`
  }
  return n(a) === n(b)
}
</script>

<template>
  <div class="field">
    <div class="field-head">
      <span class="field-label">{{ label }}</span>
      <div class="color-control">
        <label class="color-well" :style="{ background: normalized }" :title="normalized">
          <input type="color" :value="normalized" @input="onNative" />
        </label>
        <input
          class="color-hex mono"
          :value="normalized"
          spellcheck="false"
          maxlength="7"
          @change="onHex"
        />
      </div>
    </div>
    <div v-if="swatches.length" class="swatch-row">
      <button
        v-for="c in swatches"
        :key="c"
        type="button"
        class="swatch"
        :class="{ 'is-active': same(value, c) }"
        :style="{ background: c }"
        :title="c"
        @click="value = c"
      />
    </div>
  </div>
</template>

<style scoped>
.color-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 原生取色器：藏掉默认外观，只留可点击的色块 */
.color-well {
  position: relative;
  width: 30px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid var(--border-strong);
  cursor: pointer;
  overflow: hidden;
  display: block;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.35);
}

.color-well input[type='color'] {
  position: absolute;
  inset: -6px;
  width: calc(100% + 12px);
  height: calc(100% + 12px);
  border: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
}

.color-hex {
  width: 78px;
  height: 22px;
  font-size: 11.5px;
  text-align: center;
  border-radius: 6px;
  border: 1px solid var(--border-strong);
  background: var(--bg-elevated);
  color: var(--text);
  outline: none;
  text-transform: lowercase;
  padding: 0 4px;
}

.color-hex:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 2px var(--primary-soft);
}

.swatch-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.swatch {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  border: 1.5px solid var(--border-strong);
  cursor: pointer;
  padding: 0;
  transition: transform 0.12s, box-shadow 0.12s;
}

.swatch:hover {
  transform: translateY(-1px);
}

.swatch.is-active {
  box-shadow: 0 0 0 2px var(--primary);
  border-color: var(--primary);
}
</style>
