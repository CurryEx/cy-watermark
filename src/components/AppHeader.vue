<script setup>
import {
  BulbOutlined,
  BulbFilled,
  DownloadOutlined,
  GithubOutlined,
  PictureOutlined,
  SettingOutlined,
  CloudSyncOutlined,
} from '@ant-design/icons-vue'

defineProps({
  isDark: { type: Boolean, default: false },
  canInstall: { type: Boolean, default: false },
  installed: { type: Boolean, default: false },
  isIOS: { type: Boolean, default: false },
  imageCount: { type: Number, default: 0 },
  repoUrl: { type: String, default: '' },
})

const emit = defineEmits(['update:isDark', 'install', 'open-left', 'open-right'])
</script>

<template>
  <header class="app-header">
    <div class="brand">
      <svg class="brand-logo" viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id="cyBrand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#6366f1" />
            <stop offset="1" stop-color="#06b6d4" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="15" fill="url(#cyBrand)" />
        <path
          d="M32 12c0 0-13 15.4-13 24.2a13 13 0 0 0 26 0C45 27.4 32 12 32 12Z"
          fill="#fff"
          fill-opacity="0.95"
        />
        <path d="M24 44h16" stroke="#6366f1" stroke-width="3" stroke-linecap="round" opacity="0.5" />
      </svg>
      <div class="brand-text">
        <span class="brand-title">CY Watermark</span>
        <span class="brand-sub">图片水印工具</span>
      </div>
    </div>

    <a-tag v-if="installed" class="header-badge" :bordered="false" color="green">
      <CloudSyncOutlined /> 已离线安装
    </a-tag>

    <div class="header-spacer" />

    <a-button class="mobile-only" size="small" @click="emit('open-left')">
      <template #icon><PictureOutlined /></template>
      图片({{ imageCount }})
    </a-button>
    <a-button class="mobile-only" size="small" @click="emit('open-right')">
      <template #icon><SettingOutlined /></template>
      参数
    </a-button>

    <a-tooltip
      :title="
        installed
          ? '已安装为桌面应用'
          : canInstall
            ? '安装到桌面，可离线使用'
            : isIOS
              ? 'iOS：点“分享”→“添加到主屏幕”'
              : '用浏览器菜单“安装应用 / 添加到主屏幕”'
      "
    >
      <a-button size="small" :disabled="installed" @click="emit('install')">
        <template #icon><DownloadOutlined /></template>
        安装
      </a-button>
    </a-tooltip>

    <a-tooltip :title="isDark ? '切换到浅色' : '切换到深色'">
      <a-button size="small" type="text" @click="emit('update:isDark', !isDark)">
        <template #icon>
          <BulbFilled v-if="isDark" />
          <BulbOutlined v-else />
        </template>
      </a-button>
    </a-tooltip>

    <a-tooltip v-if="repoUrl" title="在 GitHub 上查看源码 / 提交建议">
      <a-button class="header-github" size="small" type="text" :href="repoUrl" target="_blank" rel="noopener">
        <template #icon><GithubOutlined /></template>
      </a-button>
    </a-tooltip>
  </header>
</template>
