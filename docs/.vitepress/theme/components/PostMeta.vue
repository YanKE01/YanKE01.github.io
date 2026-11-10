<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data as posts } from '../../../posts.data'

const { page } = useData()

// Show date and category above the article title.
const post = computed(() => {
  const url = '/' + page.value.relativePath.replace(/\.md$/, '')
  return posts.find((p) => p.url === url)
})
</script>

<template>
  <div v-if="post" class="post-meta">
    <time v-if="post.date">{{ post.date }}</time>
    <span class="cat">{{ post.category }}</span>
  </div>
</template>

<style scoped>
.post-meta {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--vp-c-text-3);
}
.cat {
  color: var(--vp-c-brand-1);
}
</style>
