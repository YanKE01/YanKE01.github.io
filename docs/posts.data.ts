// Collect all articles (excluding category index pages) for the blog home page.
import { createContentLoader } from 'vitepress'
import path from 'node:path'
import { DOCS_DIR, dirMeta } from './.vitepress/sidebar'

export interface Post {
  title: string
  url: string
  /** YYYY-MM-DD, empty if the article has no `date` */
  date: string
  categoryId: string
  categoryLabel: string
  summary: string
}

export interface Category {
  id: string
  title: string
  count: number
  children: Category[]
}

type CategoryEntry = Omit<Category, 'children'> & {
  order: number
  children: Map<string, CategoryEntry>
}

declare const data: { posts: Post[]; categories: Category[] }
export { data }

const stripTags = (s: string) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()

function formatDate(d: unknown): string {
  if (!d) return ''
  const date = new Date(d as string)
  return isNaN(date.getTime()) ? String(d) : date.toISOString().slice(0, 10)
}

function sortedCategories(entries: Map<string, CategoryEntry>): Category[] {
  return [...entries.values()]
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title, 'zh-CN'))
    .map(({ id, title, count, children }) => ({
      id, title, count, children: sortedCategories(children),
    }))
}

export default createContentLoader('**/*.md', {
  render: true,
  transform(pages) {
    const categories = new Map<string, CategoryEntry>()
    const posts = pages
      .filter((p) => p.url.split('/').filter(Boolean).length >= 2 && !p.url.endsWith('/'))
      .map((p) => {
        const folders = p.url.split('/').filter(Boolean).slice(0, -1).map(decodeURIComponent)
        let siblings = categories
        let categoryId = ''
        const categoryTitles: string[] = []
        for (const folder of folders) {
          categoryId += '/' + folder
          let category = siblings.get(categoryId)
          if (!category) {
            const { title, order } = dirMeta(path.join(DOCS_DIR, categoryId.slice(1)))
            category = { id: categoryId, title, order, count: 0, children: new Map() }
            siblings.set(categoryId, category)
          }
          category.count++
          categoryTitles.push(category.title)
          siblings = category.children
        }

        const html = p.html ?? ''
        const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1]
        const firstP = html.match(/<p>([\s\S]*?)<\/p>/)?.[1]
        let summary = String(p.frontmatter.description ?? (firstP ? stripTags(firstP) : ''))
        if (summary.length > 120) summary = summary.slice(0, 120) + '…'
        return {
          title: String(p.frontmatter.title ?? (h1 ? stripTags(h1.replace(/<a class="header-anchor"[\s\S]*?<\/a>/, '')) : p.url)),
          url: p.url,
          date: formatDate(p.frontmatter.date),
          categoryId,
          categoryLabel: categoryTitles.join(' / '),
          summary,
        }
      })
      .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh-CN'))
    return { posts, categories: sortedCategories(categories) }
  },
})
