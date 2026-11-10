<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { withBase } from 'vitepress'
import { data as all, type Question } from '../../../quiz.data'

const categories = [...new Set(all.map((q) => q.category))]
const selected = ref<string[]>([]) // 空 = 全部

const pool = computed(() =>
  selected.value.length ? all.filter((q) => selected.value.includes(q.category)) : all,
)

const current = ref<Question | null>(null)
const revealed = ref(false)
const round = ref(0) // 本轮已抽数量

// 一轮内不重复：洗牌后依次取，取完再洗
let deck: Question[] = []

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function next() {
  revealed.value = false
  if (!pool.value.length) {
    current.value = null
    return
  }
  if (!deck.length) {
    deck = shuffle(pool.value)
    // 新一轮的第一题别和上一题相同
    if (deck.length > 1 && deck.at(-1) === current.value) deck.unshift(deck.pop()!)
    round.value = 0
  }
  current.value = deck.pop()!
  round.value++
}

function toggle(c: string) {
  const i = selected.value.indexOf(c)
  i >= 0 ? selected.value.splice(i, 1) : selected.value.push(c)
}

watch(
  selected,
  () => {
    deck = []
    next()
  },
  { deep: true },
)

function onKey(e: KeyboardEvent) {
  const t = e.target as HTMLElement
  if (t.closest('input, textarea, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault()
    revealed.value = !revealed.value
  } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
    e.preventDefault()
    next()
  }
}

// 只在浏览器端抽题，避免服务端渲染和客户端结果不一致
onMounted(() => {
  next()
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="quiz">
    <div class="filters">
      <button class="chip" :class="{ active: !selected.length }" @click="selected = []">
        全部 <span class="count">{{ all.length }}</span>
      </button>
      <button
        v-for="c in categories"
        :key="c"
        class="chip"
        :class="{ active: selected.includes(c) }"
        @click="toggle(c)"
      >
        {{ c }} <span class="count">{{ all.filter((q) => q.category === c).length }}</span>
      </button>
    </div>

    <div v-if="!all.length" class="empty">
      还没有题目。在笔记里用 <code>## Q: 问题</code> 的格式写标题，下面写答案即可。
    </div>

    <div v-else-if="current" class="card">
      <div class="meta">
        <span class="badge">{{ current.category }}</span>
        <span class="progress">本轮 {{ round }} / {{ pool.length }}</span>
      </div>

      <div class="question" v-html="current.question" />

      <div v-if="revealed" class="answer" v-html="current.answer" />

      <div class="actions">
        <button class="btn" @click="revealed = !revealed">
          {{ revealed ? '隐藏答案' : '显示答案' }}
        </button>
        <button class="btn primary" @click="next">下一题 →</button>
        <a class="source" :href="withBase(current.link)">来源：{{ current.page }}</a>
      </div>
    </div>

    <p class="hint">快捷键：<kbd>空格</kbd> 显示/隐藏答案，<kbd>→</kbd> 或 <kbd>N</kbd> 下一题</p>
  </div>
</template>

<style scoped>
.quiz {
  margin-top: 24px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 20px;
}
.chip {
  padding: 4px 12px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 14px;
  color: var(--vp-c-text-2);
  background: var(--vp-c-bg);
  transition: all 0.2s;
}
.chip:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.chip.active {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.count {
  margin-left: 2px;
  font-size: 12px;
  opacity: 0.7;
}
.card {
  padding: 24px 28px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
}
.meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--vp-c-text-3);
}
.badge {
  padding: 2px 10px;
  border-radius: 6px;
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
  font-weight: 500;
}
.question {
  margin: 16px 0 8px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--vp-c-text-1);
}
.answer {
  margin-top: 16px;
  padding-top: 8px;
  border-top: 1px dashed var(--vp-c-divider);
  animation: fade 0.25s ease;
}
@keyframes fade {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
}
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}
.btn {
  padding: 6px 18px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  color: var(--vp-c-text-1);
  background: var(--vp-c-bg);
  transition: all 0.2s;
}
.btn:hover {
  border-color: var(--vp-c-brand-1);
}
.btn.primary {
  border-color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-1);
  color: var(--vp-c-white);
}
.btn.primary:hover {
  background: var(--vp-c-brand-2);
}
.source {
  margin-left: auto;
  font-size: 13px;
}
.empty {
  padding: 32px;
  text-align: center;
  color: var(--vp-c-text-2);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 16px;
}
.hint {
  font-size: 13px;
  color: var(--vp-c-text-3);
}
@media (max-width: 640px) {
  .card {
    padding: 18px 16px;
  }
  .question {
    font-size: 19px;
  }
  .source {
    margin-left: 0;
    width: 100%;
  }
}
</style>
