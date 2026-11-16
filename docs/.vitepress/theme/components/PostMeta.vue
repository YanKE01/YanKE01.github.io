<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../../../posts.data'

const { page } = useData()

// Show date and category above the article title.
const post = computed(() => {
  const url = '/' + page.value.relativePath.replace(/\.md$/, '')
  return data.posts.find((p) => p.url === url)
})

function exportPdf() {
  window.print()
}
</script>

<template>
  <div v-if="post" class="post-meta">
    <time v-if="post.date">{{ post.date }}</time>
    <span class="cat">{{ post.categoryLabel }}</span>
    <button type="button" class="export-pdf" title="在打印窗口中选择另存为 PDF" @click="exportPdf">
      导出 PDF
    </button>
  </div>
</template>

<style scoped>
.post-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 12px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--vp-c-text-3);
}
.cat {
  color: var(--vp-c-brand-1);
}

.export-pdf {
  margin-inline-start: auto;
  padding: 4px 10px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  color: var(--vp-c-brand-1);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  white-space: nowrap;
}
.export-pdf:hover {
  background: var(--vp-c-brand-soft);
}
.export-pdf:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
</style>
