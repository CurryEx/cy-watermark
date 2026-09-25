<script setup>
import { computed } from 'vue'
import SliderRow from '../base/SliderRow.vue'
import ColorField from '../base/ColorField.vue'
import { settings } from '../../stores/settings.js'
import { isLightColor } from '../../utils/math.js'

const WHITE_SWATCHES = ['#ffffff', '#f5f5f5', '#e8e8e8', '#c9c9c9', '#8c8c8c']
const DARK_SWATCHES = ['#000000', '#1c2333', '#3a3a3a', '#5c0011', '#003a8c']
const BRAND_SWATCHES = ['#4f46e5', '#1677ff', '#13c2c2', '#52c41a', '#fa8c16', '#f5222d', '#eb2f96']

const swatches = computed(() => {
  if (settings.colorMode === 'gradient') return []
  return isLightColor(settings.color)
    ? [...WHITE_SWATCHES, ...BRAND_SWATCHES]
    : [...DARK_SWATCHES, ...BRAND_SWATCHES]
})

/** 渐变快捷配色 */
const presetGradients = [
  ['#ff7a18', '#00d4ff'],
  ['#f5222d', '#722ed1'],
  ['#13c2c2', '#52c41a'],
  ['#ffffff', '#b0b7c3'],
  ['#ffd700', '#ff5f6d'],
]
function useGradient([from, to]) {
  settings.colorMode = 'gradient'
  settings.gradientFrom = from
  settings.gradientTo = to
}
</script>

<template>
  <div>
    <a-segmented
      v-model:value="settings.colorMode"
      block
      size="small"
      :options="[
        { label: '纯色', value: 'solid' },
        { label: '渐变', value: 'gradient' },
      ]"
      style="margin-bottom: 12px"
    />

    <template v-if="settings.colorMode === 'solid'">
      <ColorField v-model:value="settings.color" label="水印颜色" :swatches="swatches" />
    </template>

    <template v-else>
      <ColorField v-model:value="settings.gradientFrom" label="渐变起点" />
      <ColorField v-model:value="settings.gradientTo" label="渐变终点" />
      <SliderRow
        v-model:value="settings.gradientAngle"
        label="渐变方向"
        suffix="°"
        :min="0"
        :max="360"
        :step="1"
      />
      <div class="field">
        <div class="field-head"><span class="field-label">快捷配色</span></div>
        <div class="swatch-row">
          <button
            v-for="(g, i) in presetGradients"
            :key="i"
            type="button"
            class="swatch swatch-wide"
            :style="{ background: `linear-gradient(135deg, ${g[0]}, ${g[1]})` }"
            @click="useGradient(g)"
          />
        </div>
      </div>
    </template>

    <SliderRow
      v-model:value="settings.opacity"
      label="整体不透明度"
      suffix="%"
      tip="防盗图一般 20%~40%；单张签名可以用 70%~90%"
      :min="0"
      :max="100"
      :step="1"
    />
  </div>
</template>

<style scoped>
.swatch-wide {
  width: 40px;
}
</style>
