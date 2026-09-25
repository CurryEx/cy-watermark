<script setup>
import { computed } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import SliderRow from '../base/SliderRow.vue'
import FieldRow from '../base/FieldRow.vue'
import { POSITION_OPTIONS } from '../../config/defaults.js'
import { settings } from '../../stores/settings.js'
import { resolveMetrics } from '../../utils/watermark.js'

/** 用一个 1000×1000 的虚拟画布估算水印数量 */
const estimate = computed(() => {
  const m = resolveMetrics(1000, 1000, settings)
  const D = Math.hypot(1000, 1000)
  const cols = Math.ceil(D / m.stepX) + 1
  const rows = Math.ceil(D / m.stepY) + 1
  return { count: cols * rows, stepX: Math.round(m.stepX), stepY: Math.round(m.stepY) }
})

function resetSeed() {
  settings.jitterSeed = Math.floor(Math.random() * 1e9)
}
</script>

<template>
  <div>
    <a-segmented
      v-model:value="settings.layout"
      block
      size="small"
      :options="[
        { label: '阵列平铺', value: 'tile' },
        { label: '单个位置', value: 'single' },
      ]"
      style="margin-bottom: 12px"
    />

    <!-- ===================== 阵列 ===================== -->
    <template v-if="settings.layout === 'tile'">
      <SliderRow
        v-model:value="settings.angle"
        label="倾斜角度"
        suffix="°"
        :min="-90"
        :max="90"
        :step="1"
        help="0° 为水平，负值向左上倾斜（常用的 -30° 是经典斜纹水印）"
      />

      <SliderRow
        v-model:value="settings.densityX"
        label="水平密度"
        tip="在倾斜方向上一行能排下多少个水印"
        :min="1"
        :max="20"
        :step="0.5"
      >
      </SliderRow>

      <SliderRow
        v-model:value="settings.densityY"
        label="垂直密度"
        tip="从上到下一列能排下多少个水印"
        :min="1"
        :max="40"
        :step="0.5"
      />

      <FieldRow
        v-model:value="settings.offsetAlternate"
        label="隔行错位"
        tip="奇数行整体右移半格，形成砖块式排布，视觉上更均匀、更难被去除"
      />

      <div class="section-title" style="margin-top: 16px">自然度</div>

      <SliderRow
        v-model:value="settings.jitter"
        label="位置抖动"
        suffix="%"
        tip="每个水印在格子里随机偏移，避免机械感（采用固定随机种子，不会闪烁）"
        :min="0"
        :max="60"
        :step="1"
      />

      <SliderRow
        v-model:value="settings.jitterRotate"
        label="角度抖动"
        suffix="±°"
        :min="0"
        :max="45"
        :step="1"
      />

      <div class="field">
        <a-button size="small" block @click="resetSeed">
          <template #icon><ReloadOutlined /></template>
          换一批随机分布
        </a-button>
      </div>

      <div class="field-hint" style="margin-top: -4px">
        当前约 <b class="mono">{{ estimate.count }}</b> 个水印；格子间距
        <b class="mono">{{ estimate.stepX }}×{{ estimate.stepY }}</b> px（按 1000px 宽估算）
      </div>
    </template>

    <!-- ===================== 单个 ===================== -->
    <template v-else>
      <div class="field">
        <div class="field-head">
          <span class="field-label">位置</span>
        </div>
        <a-segmented
          v-model:value="settings.position"
          block
          size="small"
          :options="POSITION_OPTIONS"
        />
      </div>

      <SliderRow
        v-model:value="settings.positionMargin"
        label="边距"
        suffix="%"
        :min="0"
        :max="20"
        :step="0.5"
        :digits="1"
      />

      <SliderRow
        v-model:value="settings.singleAngle"
        label="旋转角度"
        suffix="°"
        :min="-180"
        :max="180"
        :step="1"
      />
    </template>
  </div>
</template>
