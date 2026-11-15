<script setup lang="ts">
import type { Category } from '../../../posts.data'

defineProps<{
  categories: Category[]
  active: string | null
}>()

const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <ul class="category-list">
    <li v-for="category in categories" :key="category.id">
      <button type="button" :aria-pressed="active === category.id" @click="emit('select', category.id)">
        <span>{{ category.title }}</span>
        <span class="count">{{ category.count }}</span>
      </button>
      <BlogCategories
        v-if="category.children.length"
        class="children"
        :categories="category.children"
        :active="active"
        @select="emit('select', $event)"
      />
    </li>
  </ul>
</template>

<style scoped>
.category-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.category-list > li + li {
  margin-top: 2px;
}

.category-list button {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 5px 10px;
  border-radius: 6px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  text-align: left;
}

.category-list button:hover,
.category-list button[aria-pressed="true"] {
  background: var(--vp-c-default-soft);
  color: var(--vp-c-text-1);
}

.category-list button[aria-pressed="true"] {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 600;
}

.count {
  color: var(--vp-c-text-2);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}

.children {
  margin: 2px 0 4px 14px;
  padding-left: 6px;
  border-left: 1px solid var(--vp-c-divider);
}
</style>
