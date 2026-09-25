<script setup>
import { message } from 'ant-design-vue'
import {
  BoldOutlined,
  ItalicOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons-vue'
import SliderRow from '../base/SliderRow.vue'
import FieldRow from '../base/FieldRow.vue'
import ColorField from '../base/ColorField.vue'
import { FONT_OPTIONS } from '../../config/defaults.js'
import { settings } from '../../stores/settings.js'
import { logo, setLogoFile, clearLogo } from '../../stores/logo.js'
import { pickFiles } from '../../utils/picker.js'
import { supportsLetterSpacing } from '../../utils/watermark.js'

const letterSpacingSupported = supportsLetterSpacing()

async function onPickLogo() {
  const files = await pickFiles({ multiple: false })
  if (!files.length) return
  try {
    await setLogoFile(files[0])
    message.success('Logo 已载入')
  } catch (e) {
    message.error(e.message || '载入失败')
  }
}

async function onLogoDrop(e) {
  const file = e.dataTransfer?.files?.[0]
  if (!file) return
  e.preventDefault()
  e.stopPropagation()
  try {
    await setLogoFile(file)
    message.success('Logo 已载入')
  } catch (err) {
    message.error(err.message || '载入失败')
  }
}
</script>

<template>
  <div>
    <!-- ===================== 文字 ===================== -->
    <template v-if="settings.type === 'text'">
      <div class="field">
        <div class="field-head">
          <span class="field-label">字体</span>
        </div>
        <a-select
          v-model:value="settings.fontFamily"
          size="small"
          style="width: 100%"
          :options="FONT_OPTIONS"
        />
        <div class="field-hint">用到的字体需在查看方设备上存在，中文建议用系统默认</div>
      </div>

      <SliderRow
        v-model:value="settings.fontSize"
        label="字号"
        suffix="% 宽"
        :min="0.5"
        :max="20"
        :step="0.1"
        :digits="1"
        help="相对图片宽度。原图 4000px 宽时，2% ≈ 80px"
      />

      <div class="field">
        <div class="field-head">
          <span class="field-label">字形</span>
          <a-space :size="4">
            <a-tooltip title="加粗">
              <a-button
                size="small"
                :type="settings.bold ? 'primary' : 'default'"
                @click="settings.bold = !settings.bold"
              >
                <template #icon><BoldOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="斜体">
              <a-button
                size="small"
                :type="settings.italic ? 'primary' : 'default'"
                @click="settings.italic = !settings.italic"
              >
                <template #icon><ItalicOutlined /></template>
              </a-button>
            </a-tooltip>
          </a-space>
        </div>
      </div>

      <SliderRow
        v-if="letterSpacingSupported"
        v-model:value="settings.letterSpacing"
        label="字间距"
        suffix="em"
        :min="-0.05"
        :max="0.5"
        :step="0.01"
        :digits="2"
      />
    </template>

    <!-- ===================== 图片 Logo ===================== -->
    <template v-else>
      <div class="field">
        <div class="field-head">
          <span class="field-label">Logo 图片</span>
          <a-button v-if="logo.bitmap" size="small" danger type="text" @click="clearLogo">
            <template #icon><DeleteOutlined /></template>
            移除
          </a-button>
        </div>
        <div
          class="logo-drop"
          :class="{ 'has-logo': !!logo.thumb }"
          @click="onPickLogo"
          @dragover.prevent
          @drop="onLogoDrop"
        >
          <img v-if="logo.thumb" :src="logo.thumb" alt="logo" />
          <div v-else class="logo-drop-empty">
            <UploadOutlined />
            <span>点击选择 / 拖入 PNG 透明图</span>
          </div>
        </div>
      </div>

      <SliderRow
        v-model:value="settings.logoScale"
        label="Logo 宽度"
        suffix="% 宽"
        :min="1"
        :max="60"
        :step="0.5"
        :digits="1"
      />
    </template>

    <!-- ===================== 描边 & 阴影 ===================== -->
    <div class="section-title" style="margin-top: 16px">描边与阴影</div>

    <FieldRow
      v-model:value="settings.strokeEnabled"
      label="描边"
      tip="为水印文字加一圈轮廓，在复杂背景上更清晰"
    />
    <template v-if="settings.strokeEnabled">
      <SliderRow
        v-model:value="settings.strokeWidth"
        label="描边粗细"
        :min="0.02"
        :max="0.4"
        :step="0.01"
        :digits="2"
      />
      <ColorField
        v-model:value="settings.strokeColor"
        label="描边颜色"
        :swatches="['#000000', '#ffffff', '#1c2333', '#f5222d', '#1677ff']"
      />
    </template>

    <FieldRow v-model:value="settings.shadowEnabled" label="投影" tip="柔和外发光/阴影，提升可读性" />
    <template v-if="settings.shadowEnabled">
      <SliderRow v-model:value="settings.shadowBlur" label="模糊程度" suffix="%" :min="0" :max="120" :step="1" />
      <ColorField v-model:value="settings.shadowColor" label="阴影颜色" :swatches="['#000000', '#ffffff', '#4f46e5', '#1677ff']" />
      <div class="field-hint" style="margin-top: -4px">阴影的浓度跟随上面的「整体不透明度」</div>
    </template>
  </div>
</template>

<style scoped>
.logo-drop {
  border: 1.5px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  min-height: 74px;
  background: var(--bg-sunken);
  transition: border-color 0.15s;
}
.logo-drop:hover {
  border-color: var(--primary);
}
.logo-drop img {
  max-width: 100%;
  max-height: 82px;
  object-fit: contain;
  display: block;
}
.logo-drop-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--text-tertiary);
  font-size: 12px;
}
</style>
