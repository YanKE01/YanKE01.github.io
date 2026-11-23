<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData, withBase } from 'vitepress'
import { data, type Category } from '../../../posts.data'
import { data as questions } from '../../../quiz.data'
import BlogCategories from './BlogCategories.vue'
import { docId } from '../docId'

const { site, theme } = useData()
const { posts, categories } = data
const navigation: Category[] = [
  { id: '', title: '全部文章', count: posts.length, children: [] },
  ...categories,
]

// Optional cover image: set `themeConfig.cover` in config.mts (e.g. '/cover.jpg' in docs/public/)
const coverStyle = computed(() =>
  theme.value.cover ? { backgroundImage: `url(${withBase(theme.value.cover)})` } : undefined,
)

const active = ref('')
const list = computed(() => {
  const category = active.value
  return category
    ? posts.filter((post) => post.categoryId === category || post.categoryId.startsWith(category + '/'))
    : posts
})
</script>

<template>
  <header class="cover" :class="{ image: coverStyle }" :style="coverStyle">
    <div class="cover-bg" aria-hidden="true" />
    <div class="cover-inner">
      <p class="label"><span class="block" />INDEX // 知识库<span class="spacer" /><span class="status"><i class="dot" />在线</span></p>
      <h1>{{ site.title }}</h1>
      <p class="desc">{{ site.description }}</p>
      <p class="stats">
        <span><b>{{ posts.length }}</b> 篇文章</span>
        <span><b>{{ categories.length }}</b> 个分类</span>
        <a :href="withBase('/quiz')"><b>{{ questions.length }}</b> 道题 →</a>
      </p>
    </div>
  </header>

  <div class="blog">
    <nav class="category-nav" aria-labelledby="blog-category-title">
      <h2 id="blog-category-title">快速导航</h2>
      <BlogCategories
        :categories="navigation"
        :active="active"
        @select="active = $event"
      />
    </nav>

    <div class="articles">
      <ul class="posts">
        <li v-for="p in list" :key="p.url">
          <a :href="withBase(p.url)" class="post">
            <div class="meta">
              <span class="no">No.{{ docId(p.url) }}</span>
              <time v-if="p.date">{{ p.date }}</time>
              <span class="cat">#{{ p.categoryLabel }}</span>
            </div>
            <h2>{{ p.title }}</h2>
            <p v-if="p.summary" class="summary">{{ p.summary }}</p>
          </a>
        </li>
      </ul>
      <p v-if="!list.length" class="empty">暂无文章。</p>
    </div>
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  overflow: hidden;
  background-color: var(--vp-c-bg-alt);
  background-size: cover;
  background-position: center;
  border-bottom: 1px solid var(--vp-c-divider);
}
/* default cover: fine grid + hazard stripe at the bottom */
.cover-bg {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--vp-c-divider) 1px, transparent 1px),
    linear-gradient(90deg, var(--vp-c-divider) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(90deg, transparent, #000 40%, #000);
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 40%, #000);
}
.cover-bg::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  background: repeating-linear-gradient(-45deg, var(--ind-accent) 0 10px, var(--vp-c-text-1) 10px 20px);
  opacity: 0.9;
}
/* custom image cover: darken for legible white text */
.cover.image .cover-bg {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.6));
  mask-image: none;
  -webkit-mask-image: none;
}
.cover.image h1,
.cover.image .desc,
.cover.image .label,
.cover.image .stats {
  color: #fff;
}
.cover-inner {
  position: relative;
  max-width: 1040px;
  margin: 0 auto;
  padding: 72px 24px 64px;
}
.label {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 560px;
  padding-bottom: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--vp-c-divider);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-1);
}
.label .block {
  width: 10px;
  height: 10px;
  background: var(--ind-accent);
  outline: 1px solid var(--vp-c-text-1);
  outline-offset: -1px;
}
.label .spacer {
  flex: 1;
}
.status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-weight: 400;
  color: var(--vp-c-text-3);
}
.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  50% { opacity: 0.35; }
}
.cover h1 {
  font-size: 64px;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.04em;
  color: var(--vp-c-text-1);
}
.desc {
  margin-top: 16px;
  font-size: 17px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
}
.stats > * {
  padding: 5px 12px;
  border: 1px solid var(--vp-c-border);
  border-radius: var(--ind-radius);
  background: var(--vp-c-bg);
  color: var(--vp-c-text-2);
}
.stats b {
  color: var(--vp-c-text-1);
  font-weight: 800;
}
.stats a {
  border-color: var(--vp-c-text-1);
  background: var(--ind-accent);
  color: var(--ind-accent-ink);
  transition: transform 0.15s;
}
.stats a b {
  color: inherit;
}
.stats a:hover {
  transform: translate(-2px, -2px);
  box-shadow: 2px 2px 0 var(--vp-c-text-1);
}
.cover.image .stats > * {
  border-color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}
.blog {
  display: grid;
  grid-template-columns: 196px minmax(0, 1fr);
  align-items: start;
  gap: 40px;
  max-width: 1040px;
  margin: 0 auto;
  padding: 28px 24px 96px;
}
.category-nav {
  position: sticky;
  top: calc(var(--vp-nav-height) + 16px);
  max-height: calc(100dvh - var(--vp-nav-height) - 32px);
  overflow: auto;
  padding: 8px 12px 8px 0;
  border-right: 1px solid var(--vp-c-divider);
}
.category-nav h2 {
  margin: 0 10px 8px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--vp-c-text-3);
}
.posts {
  display: grid;
  gap: 12px;
  list-style: none;
  padding: 8px 0 0;
  margin: 0;
}
.post {
  position: relative;
  display: block;
  padding: 18px 22px 18px 24px;
  border: 1px solid var(--vp-c-divider);
  border-radius: var(--ind-radius);
  background: var(--vp-c-bg);
  color: inherit;
  transition: border-color 0.15s, transform 0.15s, box-shadow 0.15s;
}
.post::before {
  content: '';
  position: absolute;
  inset: -1px auto -1px -1px;
  width: 4px;
  background: var(--ind-accent);
  transform: scaleY(0);
  transform-origin: top;
  transition: transform 0.2s;
}
.post:hover {
  border-color: var(--vp-c-text-1);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--vp-c-text-1);
}
.post:hover::before {
  transform: scaleY(1);
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px 14px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.no {
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.cat {
  padding: 0 6px;
  border-radius: var(--ind-radius);
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  text-transform: uppercase;
}
.post h2 {
  margin-top: 8px;
  font-size: 20px;
  font-weight: 800;
  line-height: 1.45;
  letter-spacing: -0.01em;
}
.summary {
  margin-top: 6px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.empty {
  padding: 40px 0;
  font-family: var(--vp-font-family-mono);
  color: var(--vp-c-text-3);
}
@media (max-width: 720px) {
  .blog {
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
  }
  .category-nav {
    position: static;
    max-height: 240px;
    padding: 0 8px 12px 0;
    border-right: 0;
    border-bottom: 1px solid var(--vp-c-divider);
  }
}
@media (max-width: 640px) {
  .cover-inner {
    padding: 48px 16px 44px;
  }
  .cover h1 {
    font-size: 40px;
  }
  .desc {
    font-size: 15px;
  }
  .blog {
    padding: 20px 16px 64px;
  }
}
</style>
