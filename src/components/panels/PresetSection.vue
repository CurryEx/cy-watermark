<script setup>
import { computed, ref } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  ColumnHeightOutlined,
  DeleteOutlined,
  LineOutlined,
  SaveOutlined,
} from '@ant-design/icons-vue'
import {
  applySettings,
  deletePreset,
  presets,
  savePreset,
  settings,
} from '../../stores/settings.js'

const newName = ref('')

const builtinPresets = computed(() => presets.filter((p) => p.builtin))
const customPresets = computed(() => presets.filter((p) => !p.builtin))

/* ------------------ 快捷密度：按比例同时缩放水平 / 垂直密度 ------------------ */

// 与「排布与密度」里两个滑块的范围保持一致
const DENSITY_X = [1, 20]
const DENSITY_Y = [1, 40]
const DENSITY_STEP = 0.5

/** 对齐到滑块步长，并限制在范围内 */
function snap(v, [min, max]) {
  const n = Math.round(v / DENSITY_STEP) * DENSITY_STEP
  return Math.min(max, Math.max(min, Math.round(n * 100) / 100))
}

function scaleDensity(k) {
  const x = snap(settings.densityX * k, DENSITY_X)
  const y = snap(settings.densityY * k, DENSITY_Y)
  if (x === settings.densityX && y === settings.densityY) {
    message.info(k > 1 ? '已经是最密了' : '已经是最疏了')
    return
  }
  settings.densityX = x
  settings.densityY = y
}

/** 应用预设：只改参数，不动水印文字 */
function use(preset) {
  applySettings(preset.settings)
  message.success(`已应用「${preset.name}」`)
}

function doSave() {
  const name = newName.value.trim()
  if (!name) {
    message.warning('请先给预设起个名字')
    return
  }
  savePreset(name)
  newName.value = ''
  message.success('已保存到本地')
}

function doDelete(preset) {
  Modal.confirm({
    title: '删除这个预设？',
    content: preset.name,
    okText: '删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => {
      deletePreset(preset.id)
      message.success('已删除')
    },
  })
}
</script>

<template>
  <div>
    <!-- ===================== 预设模板 ===================== -->
    <div class="preset-grid">
      <button
        v-for="p in builtinPresets"
        :key="p.id"
        type="button"
        class="preset-card"
        @click="use(p)"
      >
        <span class="preset-card-name">{{ p.name }}</span>
        <span class="preset-card-desc">{{ p.desc }}</span>
      </button>
    </div>

    <!-- ===================== 水印内容 ===================== -->
    <div style="margin-top: 16px">
      <a-segmented
        v-model:value="settings.type"
        block
        size="small"
        :options="[
          { label: '文字水印', value: 'text' },
          { label: '图片 Logo', value: 'image' },
        ]"
      />
    </div>

    <div v-if="settings.type === 'text'" class="field" style="margin-top: 10px">
      <div class="field-head">
        <span class="field-label">水印文字</span>
      </div>
      <a-textarea
        v-model:value="settings.text"
        :rows="2"
        :maxlength="120"
        placeholder="例如：仅用于XX业务"
        show-count
      />
      <div class="field-hint">换行会变成两行文字（例如第一行说明、第二行署名）</div>
    </div>

    <div v-else class="field-hint" style="margin-top: 8px">
      图片水印的 Logo 在下方「字体设置」里选择
    </div>

    <!-- ===================== 密度快捷调整 ===================== -->
    <div class="density-row">
      <a-tooltip title="水印排得更密（同时放大水平 / 垂直密度）">
        <a-button size="small" block @click="scaleDensity(1.25)">
          <template #icon><ColumnHeightOutlined /></template>
          密一点
        </a-button>
      </a-tooltip>
      <a-tooltip title="水印排得更疏（同时缩小水平 / 垂直密度）">
        <a-button size="small" block @click="scaleDensity(0.8)">
          <template #icon><LineOutlined /></template>
          疏一点
        </a-button>
      </a-tooltip>
    </div>
    <div class="field-hint" style="margin-top: 4px">
      按比例同时调整水平 / 垂直密度（阵列平铺时生效），细调在下方「排布与密度」里
    </div>

    <!-- ===================== 我的预设 ===================== -->
    <div class="section-title" style="margin-top: 16px">我的预设</div>

    <div style="display: flex; gap: 6px">
      <a-input
        v-model:value="newName"
        size="small"
        placeholder="给当前参数起个名字"
        style="flex: 1"
        @press-enter="doSave"
      />
      <a-button size="small" type="primary" @click="doSave">
        <template #icon><SaveOutlined /></template>
        保存
      </a-button>
    </div>

    <div v-if="!customPresets.length" class="field-hint" style="margin-top: 6px">
      还没有自定义预设。调好参数后点「保存」（只记参数，不改文字）
    </div>
    <div v-else style="margin-top: 6px">
      <div v-for="p in customPresets" :key="p.id" class="preset-item" @click="use(p)">
        <span class="preset-name">{{ p.name }}</span>
        <a-button type="text" size="small" danger @click.stop="doDelete(p)">
          <template #icon><DeleteOutlined /></template>
        </a-button>
      </div>
    </div>
  </div>
</template>
