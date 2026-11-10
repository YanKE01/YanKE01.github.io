// 构建时扫描所有笔记，把 "## Q: ..." 标题及其下方内容提取成题库。
import { createContentLoader } from 'vitepress'
import { categoryTitle } from './.vitepress/sidebar'

export interface Question {
  /** 问题（HTML，可含行内代码等） */
  question: string
  /** 答案（HTML） */
  answer: string
  /** 原文链接（含锚点，不含 base） */
  link: string
  /** 所在笔记标题 */
  page: string
  /** 一级分类 */
  category: string
}

declare const data: Question[]
export { data }

const HEADING = /<h([12]) id="([^"]*)"[^>]*>([\s\S]*?)<\/h\1>/g
const ANCHOR = /<a class="header-anchor"[\s\S]*?<\/a>/g
const Q_PREFIX = /^\s*Q\s*[:：]\s*/
const stripTags = (s: string) => s.replace(/<[^>]+>/g, '')

export default createContentLoader('**/*.md', {
  render: true,
  transform(pages) {
    const out: Question[] = []

    for (const p of pages) {
      const segs = p.url.split('/').filter(Boolean)
      if (segs.length < 2 || !p.html) continue // 跳过根目录页面（首页、抽题页）

      const html = p.html
      const heads = [...html.matchAll(HEADING)].map((m) => ({
        level: m[1],
        id: m[2],
        inner: m[3].replace(ANCHOR, '').trim(),
        start: m.index!,
        end: m.index! + m[0].length,
      }))

      const h1 = heads.find((h) => h.level === '1')
      const page = String(p.frontmatter.title ?? (h1 ? stripTags(h1.inner) : segs.at(-1)))
      const category = categoryTitle(decodeURIComponent(segs[0]))

      heads.forEach((h, i) => {
        if (h.level !== '2' || !Q_PREFIX.test(stripTags(h.inner))) return
        const nextStart = heads[i + 1]?.start ?? html.length
        out.push({
          question: h.inner.replace(Q_PREFIX, ''),
          answer: html.slice(h.end, nextStart).trim(),
          link: `${p.url}#${h.id}`,
          page,
          category,
        })
      })
    }

    return out
  },
})
