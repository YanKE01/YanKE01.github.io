import { h } from 'vue'
import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import Quiz from './components/Quiz.vue'
import BlogHome from './components/BlogHome.vue'
import PostMeta from './components/PostMeta.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout: () => h(DefaultTheme.Layout, null, { 'doc-before': () => h(PostMeta) }),
  enhanceApp({ app }) {
    app.component('Quiz', Quiz)
    app.component('BlogHome', BlogHome)
  },
} satisfies Theme
