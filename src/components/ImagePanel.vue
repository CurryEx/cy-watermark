<script setup>
import { computed } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  DeleteOutlined,
  EyeOutlined,
  PlusOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ExperimentOutlined,
  ClearOutlined,
  PictureOutlined,
} from '@ant-design/icons-vue'
import {
  images,
  activeImage,
  addFiles,
  addSampleIdCard,
  clearImages,
  moveImage,
  removeImage,
  selectImage,
} from '../stores/images.js'
import { pickFiles } from '../utils/picker.js'
import { formatBytes } from '../utils/format.js'

const totalSize = computed(() => images.list.reduce((s, i) => s + (i.size || 0), 0))

async function onAdd() {
  const files = await pickFiles({ multiple: true })
  if (!files.length) return
  const res = await addFiles(files)
  if (res.added) message.success(`已添加 ${res.added} 张图片`)
  if (res.skipped) message.warning(`${res.skipped} 个文件无法解码，已跳过`)
}

async function onSamples() {
  await addSampleIdCard()
  message.success('已生成一张虚拟证件示例图（卡通风格，仅供试用）')
}

function confirmClear() {
  Modal.confirm({
    title: '清空图片列表？',
    content: `将移除列表中的 ${images.list.length} 张图片（不会影响你硬盘上的原文件）。`,
    okText: '清空',
    okType: 'danger',
    cancelText: '取消',
    onOk: clearImages,
  })
}
</script>

<template>
  <div class="panel panel-left">
    <div class="panel-head">
      <span>图片列表</span>
      <span class="head-sub" v-if="images.list.length">
        {{ images.list.length }} 张 · {{ formatBytes(totalSize) }}
      </span>
      <span class="head-sub" v-else>共 0 张</span>
    </div>

    <div class="panel-body">
      <div v-if="!images.list.length" class="empty-box">
        <div class="empty-lite">
          <PictureOutlined class="empty-lite-icon" />
          <div>还没有图片</div>
          <div class="empty-lite-sub">拖拽 / 粘贴 / 点击下方按钮添加</div>
        </div>
      </div>

      <div v-else class="image-list">
        <div
          v-for="(item, idx) in images.list"
          :key="item.id"
          class="image-item"
          :class="{ 'is-active': item.id === activeImage?.id }"
          @click="selectImage(item.id)"
        >
          <img class="image-thumb" :src="item.thumb" alt="" loading="lazy" />
          <div class="image-meta">
            <div class="image-name" :title="item.name">{{ item.name }}</div>
            <div class="image-size">
              {{ item.width }}×{{ item.height }} · {{ formatBytes(item.size) }}
            </div>
          </div>
          <div class="image-actions" @click.stop>
            <a-tooltip title="上移">
              <a-button
                type="text"
                size="small"
                :disabled="idx === 0"
                @click="moveImage(item.id, -1)"
              >
                <template #icon><ArrowUpOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="下移">
              <a-button
                type="text"
                size="small"
                :disabled="idx === images.list.length - 1"
                @click="moveImage(item.id, 1)"
              >
                <template #icon><ArrowDownOutlined /></template>
              </a-button>
            </a-tooltip>
            <a-tooltip title="移除">
              <a-button type="text" size="small" danger @click="removeImage(item.id)">
                <template #icon><DeleteOutlined /></template>
              </a-button>
            </a-tooltip>
          </div>
        </div>
      </div>
    </div>

    <div class="panel-foot" style="flex-direction: column">
      <a-button type="primary" block @click="onAdd">
        <template #icon><PlusOutlined /></template>
        添加图片
      </a-button>
      <a-space style="width: 100%; justify-content: space-between">
        <a-button size="small" type="text" @click="onSamples">
          <template #icon><ExperimentOutlined /></template>
          示例证件
        </a-button>
        <a-button size="small" type="text" danger :disabled="!images.list.length" @click="confirmClear">
          <template #icon><ClearOutlined /></template>
          清空
        </a-button>
      </a-space>
      <div class="field-hint" style="margin: 0">
        <EyeOutlined /> 支持 JPG / PNG / WebP / AVIF / GIF；图片不会上传到任何服务器。
      </div>
    </div>
  </div>
</template>

<style scoped>
.empty-box {
  padding: 22px 10px;
}
</style>
