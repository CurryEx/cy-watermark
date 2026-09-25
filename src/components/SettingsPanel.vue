<script setup>
import { ref } from 'vue'
import {
  AppstoreOutlined,
  BgColorsOutlined,
  DownloadOutlined,
  FileTextOutlined,
  TableOutlined,
} from '@ant-design/icons-vue'
import FontSection from './panels/FontSection.vue'
import LayoutSection from './panels/LayoutSection.vue'
import ColorSection from './panels/ColorSection.vue'
import ExportSection from './panels/ExportSection.vue'
import PresetSection from './panels/PresetSection.vue'
import { settings } from '../stores/settings.js'

const presetKeys = ref(['preset']) // 「预设」默认展开
const advKeys = ref([]) // 高级设置默认收起
</script>

<template>
  <div class="panel panel-right">
    <div class="panel-head">
      <span>水印参数</span>
      <a-space :size="6">
        <a-tooltip title="临时关闭水印，方便对比效果">
          <a-switch v-model:checked="settings.enabled" size="small" />
        </a-tooltip>
      </a-space>
    </div>

    <div class="panel-body">
      <div class="settings-scroll">
        <a-collapse v-model:activeKey="presetKeys" ghost :bordered="false">
          <a-collapse-panel key="preset">
            <template #header>
              <a-space :size="6"><AppstoreOutlined /> 预设</a-space>
            </template>
            <PresetSection />
          </a-collapse-panel>
        </a-collapse>

        <div class="adv-divider"><span>高级设置</span></div>

        <a-collapse v-model:activeKey="advKeys" ghost :bordered="false">
          <a-collapse-panel key="font">
            <template #header>
              <a-space :size="6"><FileTextOutlined /> 字体设置</a-space>
            </template>
            <FontSection />
          </a-collapse-panel>

          <a-collapse-panel key="layout">
            <template #header>
              <a-space :size="6"><TableOutlined /> 排布与密度</a-space>
            </template>
            <LayoutSection />
          </a-collapse-panel>

          <a-collapse-panel key="color">
            <template #header>
              <a-space :size="6"><BgColorsOutlined /> 颜色与透明度</a-space>
            </template>
            <ColorSection />
          </a-collapse-panel>

          <a-collapse-panel key="export">
            <template #header>
              <a-space :size="6"><DownloadOutlined /> 导出设置</a-space>
            </template>
            <ExportSection />
          </a-collapse-panel>
        </a-collapse>
      </div>
    </div>
  </div>
</template>
