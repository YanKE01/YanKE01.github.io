<script setup lang="ts">
import { computed, ref } from 'vue'
import { useData, withBase } from 'vitepress'
import { data, type Category } from '../../../posts.data'
import { data as questions } from '../../../quiz.data'
import BlogCategories from './BlogCategories.vue'

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
      <h1>{{ site.title }}</h1>
      <p class="desc">{{ site.description }}</p>
      <p class="stats">
        <span>{{ posts.length }} 篇文章</span>
        <span>{{ categories.length }} 个分类</span>
        <a :href="withBase('/quiz')">{{ questions.length }} 道题 →</a>
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
              <time v-if="p.date">{{ p.date }}</time>
              <span class="cat">{{ p.categoryLabel }}</span>
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
/* default cover: gradient glow + fine grid */
.cover-bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 80% at 15% 20%, rgba(99, 102, 241, 0.35), transparent 70%),
    radial-gradient(ellipse 50% 70% at 85% 30%, rgba(6, 182, 212, 0.28), transparent 70%),
    radial-gradient(ellipse 50% 60% at 60% 100%, rgba(168, 85, 247, 0.22), transparent 70%);
}
.cover-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--vp-c-divider) 1px, transparent 1px),
    linear-gradient(90deg, var(--vp-c-divider) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(ellipse 70% 90% at 50% 40%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 70% 90% at 50% 40%, #000 30%, transparent 75%);
  opacity: 0.7;
}
/* custom image cover: darken for legible white text */
.cover.image .cover-bg {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25), rgba(0, 0, 0, 0.6));
}
.cover.image .cover-bg::after {
  display: none;
}
.cover.image h1,
.cover.image .desc,
.cover.image .stats {
  color: #fff;
}
.cover-inner {
  position: relative;
  max-width: 1040px;
  margin: 0 auto;
  padding: 96px 24px 72px;
}
.cover h1 {
  font-size: 48px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.03em;
  background: linear-gradient(120deg, var(--vp-c-text-1) 30%, var(--vp-c-brand-1));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.cover.image h1 {
  background: none;
}
.desc {
  margin-top: 16px;
  font-size: 18px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
}
.stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 28px;
  font-size: 13px;
}
.stats > * {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: color-mix(in srgb, var(--vp-c-bg) 70%, transparent);
  backdrop-filter: blur(6px);
  color: var(--vp-c-text-2);
}
.stats a {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
  transition: background 0.2s;
}
.stats a:hover {
  background: var(--vp-c-brand-soft);
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
  font-size: 14px;
  font-weight: 600;
}
.posts {
  list-style: none;
  padding: 0;
  margin: 0;
}
.post {
  display: block;
  padding: 24px 0;
  border-bottom: 1px solid var(--vp-c-divider);
  color: inherit;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 12px;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
.cat {
  color: var(--vp-c-brand-1);
}
.post h2 {
  margin-top: 6px;
  font-size: 21px;
  font-weight: 600;
  line-height: 1.45;
  transition: color 0.2s;
}
.post:hover h2 {
  color: var(--vp-c-brand-1);
}
.summary {
  margin-top: 8px;
  font-size: 15px;
  line-height: 1.7;
  color: var(--vp-c-text-2);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.empty {
  padding: 40px 0;
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
    padding: 64px 16px 48px;
  }
  .cover h1 {
    font-size: 34px;
  }
  .desc {
    font-size: 16px;
  }
  .blog {
    padding: 20px 16px 64px;
  }
}
</style>
