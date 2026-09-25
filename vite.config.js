import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * GitHub Pages 基路径计算
 * - Actions 构建时会注入 GITHUB_REPOSITORY="owner/repo"
 * - 项目页  → base = "/<repo>/"
 * - 用户页（<user>.github.io）→ base = "/"
 * - 本地开发 → base = "/"
 */
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = repoName && !repoName.endsWith('.github.io') ? `/${repoName}/` : '/'

export default defineConfig({
  base,
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        name: 'CY Watermark · 图片批量加水印',
        short_name: '加水印',
        description:
          '纯本地运行的图片批量加水印工具：阵列平铺、角度 / 密度 / 颜色 / 渐变 / 透明度可调，支持 EXIF 抹除与批量导出。',
        lang: 'zh-CN',
        theme_color: '#4f46e5',
        background_color: '#0f172a',
        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone', 'minimal-ui'],
        orientation: 'any',
        start_url: './',
        scope: './',
        categories: ['photo', 'utilities', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // 拆出体积较大的第三方库，利于浏览器缓存（Vite 8 / rolldown 只接受函数形式）
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/ant-design-vue/') || id.includes('/@ant-design/')) return 'antd'
          if (id.includes('/jszip/')) return 'zip'
          if (id.includes('/vue/') || id.includes('/@vue/')) return 'vue'
          return undefined
        },
      },
    },
  },
})
