<script setup>
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { activeImage, ensureExif } from '../stores/images.js'
import { settings } from '../stores/settings.js'
import { EXIF_FIELD_LABELS } from '../utils/exif.js'

const props = defineProps({
  open: { type: Boolean, default: false },
  record: { type: Object, default: null },
})
const emit = defineEmits(['update:open'])

const loading = ref(false)
const data = ref({})

watch(
  () => [props.open, props.record?.id],
  async () => {
    if (!props.open || !props.record) return
    loading.value = true
    data.value = await ensureExif(props.record)
    loading.value = false
  },
  { immediate: true },
)

const rows = computed(() =>
  Object.entries(data.value || {}).map(([k, v]) => ({
    key: k,
    label: EXIF_FIELD_LABELS[k] || k,
    value: String(v),
  })),
)

function onCopyAll() {
  const text = rows.value.map((r) => `${r.label}: ${r.value}`).join('\n')
  navigator.clipboard?.writeText(text).then(
    () => message.success('EXIF 已复制'),
    () => message.error('复制失败'),
  )
}
</script>

<template>
  <a-modal
    :open="open"
    title="EXIF 元数据"
    :footer="null"
    width="560px"
    @cancel="emit('update:open', false)"
  >
    <a-spin :spinning="loading">
      <div v-if="record" class="exif-head">
        <div class="exif-name">{{ record.name }}</div>
        <div class="exif-sub mono">
          {{ record.width }}×{{ record.height }} · {{ record.file?.type || '未知格式' }}
        </div>
      </div>

      <a-alert
        v-if="settings.keepExif"
        type="warning"
        show-icon
        style="margin-bottom: 12px"
        message="当前已开启「保留原始 EXIF」"
        description="导出时会把这些信息（含可能存在的 GPS 定位）一起写回图片。如果你要发到公开平台，建议关闭。"
      />
      <a-alert
        v-else
        type="success"
        show-icon
        style="margin-bottom: 12px"
        message="默认会抹除全部元数据"
        description="导出的图片不会包含任何相机型号、拍摄时间或 GPS 定位信息。"
      />

      <a-descriptions v-if="rows.length" bordered size="small" :column="1">
        <a-descriptions-item v-for="r in rows" :key="r.key" :label="r.label">
          {{ r.value }}
        </a-descriptions-item>
      </a-descriptions>

      <div v-else class="empty-lite">
        <div>没有可读取的 EXIF</div>
        <div class="empty-lite-sub">可能不是 JPEG，或作者在导出时已经抹除</div>
      </div>
    </a-spin>

    <template #footer>
      <a-space>
        <a-button v-if="rows.length" size="small" @click="onCopyAll">复制全部</a-button>
        <a-button type="primary" size="small" @click="emit('update:open', false)">关闭</a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<style scoped>
.exif-head {
  margin-bottom: 10px;
}
.exif-name {
  font-weight: 600;
  font-size: 13px;
  word-break: break-all;
}
.exif-sub {
  font-size: 11.5px;
  color: var(--text-tertiary);
}
</style>
