import { defineConfig } from 'vitepress'
import { buildSidebar, sidebarAutoReload } from './sidebar'
import { wavedromPlugin } from './wavedrom'
import { usbDiagramPlugin } from './usbdiagram'

export default defineConfig({
  lang: 'zh-CN',
  title: '学习笔记',
  description: '记录学习过程中的知识整理与思考。',
  // 部署时由 GitHub Actions 自动设置，本地默认 '/'
  base: process.env.VITEPRESS_BASE || '/',
  cleanUrls: true,
  lastUpdated: true,

  vite: {
    plugins: [sidebarAutoReload()],
  },

  markdown: {
    lineNumbers: true,
    math: true,
    config(md) {
      md.use(wavedromPlugin)
      md.use(usbDiagramPlugin)
    },
  },

  themeConfig: {
    // Home page cover image (put the file in docs/public/). Leave unset for the default gradient cover.
    // cover: '/cover.jpg',

    nav: [
      { text: '首页', link: '/' },
      { text: '随机抽题', link: '/quiz' },
    ],

    sidebar: buildSidebar(),

    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索', buttonAriaLabel: '搜索' },
          modal: {
            noResultsText: '没有找到相关结果',
            resetButtonTitle: '清除',
            footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
          },
        },
      },
    },

    outline: { level: [2, 3], label: '本页目录' },
    docFooter: { prev: '上一篇', next: '下一篇' },
    lastUpdated: { text: '最后更新' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '目录',
    darkModeSwitchLabel: '外观',
    lightModeSwitchTitle: '切换到浅色',
    darkModeSwitchTitle: '切换到深色',

    socialLinks: [{ icon: 'github', link: 'https://github.com/YanKE01' }],
  },
})
