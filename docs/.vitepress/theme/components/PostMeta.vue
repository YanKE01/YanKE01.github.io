<script setup lang="ts">
import { computed } from 'vue'
import { useData } from 'vitepress'
import { data } from '../../../posts.data'
import { docId } from '../docId'

const { page } = useData()

// Show document number, date and category above the article title.
const post = computed(() => {
  const url = '/' + page.value.relativePath.replace(/\.md$/, '')
  return data.posts.find((p) => p.url === url)
})
const id = computed(() => (post.value ? docId(post.value.url) : ''))

function exportPdf() {
  window.print()
}
</script>

<template>
  <div v-if="post" class="post-meta">
    <div class="bar">
      <span class="doc-id">文档编号 // {{ id }}</span>
      <span class="spacer" />
      <span class="status"><i class="dot" />在线</span>
    </div>
    <div class="info">
      <time v-if="post.date">{{ post.date }}</time>
      <span class="cat">#{{ post.categoryLabel }}</span>
      <button type="button" class="export-pdf" title="在打印窗口中选择另存为 PDF" @click="exportPdf">
        导出 PDF
      </button>
    </div>
  </div>
</template>

<style scoped>
.post-meta {
  margin-bottom: 16px;
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  color: var(--vp-c-text-3);
}
.bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-bottom: 8px;
  margin-bottom: 12px;
  border-bottom: 1px solid var(--vp-c-divider);
}
.doc-id {
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.spacer {
  flex: 1;
}
.status {
  display: flex;
  align-items: center;
  gap: 6px;
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
.info {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 16px;
  font-size: 13px;
  color: var(--vp-c-text-2);
}
.cat {
  padding: 1px 8px;
  border-radius: var(--ind-radius);
  background: var(--vp-c-bg-soft);
  font-size: 12px;
  text-transform: uppercase;
}
.export-pdf {
  margin-inline-start: auto;
  padding: 3px 10px;
  border: 1px solid var(--vp-c-text-1);
  border-radius: var(--ind-radius);
  color: var(--vp-c-text-1);
  font-family: var(--vp-font-family-mono);
  font-size: 12px;
  line-height: 20px;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.export-pdf:hover {
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
}
.export-pdf:focus-visible {
  outline: 2px solid var(--ind-accent);
  outline-offset: 2px;
}
@media print {
  .bar,
  .export-pdf {
    display: none;
  }
}
</style>
