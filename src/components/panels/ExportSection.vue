<script setup>
import { computed } from 'vue'
import SliderRow from '../base/SliderRow.vue'
import FieldRow from '../base/FieldRow.vue'
import ColorField from '../base/ColorField.vue'
import { settings } from '../../stores/settings.js'
import { images } from '../../stores/images.js'

const count = computed(() => images.list.length)

const SIZE_OPTIONS = [
  { label: '原始尺寸', value: 0 },
  { label: '4096 px', value: 4096 },
  { label: '2560 px', value: 2560 },
  { label: '1920 px', value: 1920 },
  { label: '1280 px', value: 1280 },
  { label: '1080 px', value: 1080 },
]
</script>

<template>
  <div>
    <a-segmented
      v-model:value="settings.format"
      block
      size="small"
      :options="[
        { label: 'JPG', value: 'jpeg' },
        { label: 'PNG', value: 'png' },
        { label: 'WebP', value: 'webp' },
      ]"
      style="margin-bottom: 12px"
    />

    <SliderRow
      v-if="settings.format !== 'png'"
      v-model:value="settings.quality"
      label="输出画质"
      suffix="%"
      tip="JPG/WebP 为有损格式：92% 左右画质与体积最平衡"
      :min="30"
      :max="100"
      :step="1"
    />

    <div class="field">
      <div class="field-head">
        <span class="field-label">最长边限制</span>
      </div>
      <a-select
        v-model:value="settings.maxSize"
        size="small"
        style="width: 100%"
        :options="SIZE_OPTIONS"
      />
      <div class="field-hint">用于社交平台时，压到 1920px 可以明显减小体积</div>
    </div>

    <ColorField
      v-if="settings.format === 'jpeg'"
      v-model:value="settings.jpegBackground"
      label="JPG 底色（透明区域填充）"
      :swatches="['#ffffff', '#000000', '#f5f5f5']"
    />

    <div class="section-title" style="margin-top: 16px">元数据</div>

    <FieldRow
      v-model:value="settings.keepExif"
      label="保留原始 EXIF"
      tip="EXIF 里包含手机/相机型号、拍摄时间、甚至 GPS 定位。默认会全部抹除，只留下干净的图片"
      help="关闭时（默认）导出的图片不含任何元数据；打开后仅对 JPG→JPG 生效，并会把方向标记重置为正常，避免被二次旋转"
    />

    <div class="section-title" style="margin-top: 16px">文件名</div>

    <div class="field">
      <div class="field-head"><span class="field-label">命名模板</span></div>
      <a-input v-model:value="settings.filenamePattern" size="small" />
      <div class="field-hint">
        可用变量：<code>{name}</code> 原文件名 · <code>{index}</code> 序号 · <code>{date}</code> 日期 ·
        <code>{time}</code> 时间 · <code>{w}</code>·<code>{h}</code> 尺寸
      </div>
    </div>

    <div class="field" v-if="count > 1">
      <div class="field-head"><span class="field-label">ZIP 压缩包名</span></div>
      <a-input v-model:value="settings.zipName" size="small" />
    </div>

    <div class="field-hint" style="margin-top: 12px">
      保存 / 导出用预览区工具栏的「保存」按钮，也可以直接按 <b>Ctrl/⌘ + S</b>。
    </div>
  </div>
</template>

<style scoped>
code {
  background: var(--bg-sunken);
  padding: 1px 4px;
  border-radius: 4px;
  font-size: 11px;
}
</style>
