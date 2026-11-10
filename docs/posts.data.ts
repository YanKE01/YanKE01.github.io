// Collect all articles (excluding category index pages) for the blog home page.
import { createContentLoader } from 'vitepress'
import { categoryTitle } from './.vitepress/sidebar'

export interface Post {
  title: string
  url: string
  /** YYYY-MM-DD, empty if the article has no `date` */
  date: string
  category: string
  summary: string
}

declare const data: Post[]
export { data }

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

function formatDate(d: unknown): string {
  if (!d) return ''
  const date = new Date(d as string)
  return isNaN(date.getTime()) ? String(d) : date.toISOString().slice(0, 10)
}

export default createContentLoader('**/*.md', {
  render: true,
  transform(pages) {
    return pages
      .filter((p) => p.url.split('/').filter(Boolean).length >= 2 && !p.url.endsWith('/'))
      .map((p) => {
        const html = p.html ?? ''
        const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
        const firstP = html.match(/<p>([\s\S]*?)<\/p>/)?.[1]
        let summary = String(p.frontmatter.description ?? (firstP ? stripTags(firstP) : ''))
        if (summary.length > 120) summary = summary.slice(0, 120) + '…'
        return {
          title: String(p.frontmatter.title ?? (h1 ? stripTags(h1.replace(/<a class="header-anchor"[\s\S]*?<\/a>/, '')) : p.url)),
          url: p.url,
          date: formatDate(p.frontmatter.date),
          category: categoryTitle(decodeURIComponent(p.url.split('/').filter(Boolean)[0])),
          summary,
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'))
  },
})
