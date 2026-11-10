// 根据 docs/ 下的目录结构自动生成侧边栏：
//   一级文件夹 = 一个分类；子文件夹 = 子分类；每个 .md = 一篇笔记。
// 标题优先取 frontmatter 的 title，其次取正文第一个 "# 标题"，最后用文件名。
// 排序：frontmatter 里的 order（数字，越小越靠前），没有则按名称排序。
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import type { DefaultTheme } from 'vitepress'
import type { Plugin } from 'vite'

export const DOCS_DIR = path.resolve(__dirname, '..')
const IGNORE = new Set(['public', 'node_modules'])

interface Meta {
  title: string
  order: number
}

function readMeta(file: string, fallback: string): Meta {
  const { data, content } = matter(fs.readFileSync(file, 'utf-8'))
  const h1 = content.match(/^#\s+(.+)$/m)?.[1]?.trim()
  return {
    title: String(data.title ?? h1 ?? fallback),
    order: typeof data.order === 'number' ? data.order : Infinity,
  }
}

/** 文件夹的显示名：有 index.md 就用它的标题，否则用文件夹名 */
export function dirMeta(dir: string): Meta {
  const index = path.join(dir, 'index.md')
  return fs.existsSync(index)
    ? readMeta(index, path.basename(dir))
    : { title: path.basename(dir), order: Infinity }
}

/** 一级分类文件夹名 -> 显示名（抽题页用） */
export function categoryTitle(dirName: string): string {
  return dirMeta(path.join(DOCS_DIR, dirName)).title
}

function toLink(file: string): string {
  return '/' + path.relative(DOCS_DIR, file).split(path.sep).join('/').replace(/(index)?\.md$/, '')
}

type Item = DefaultTheme.SidebarItem & { _order: number }

function walk(dir: string, depth: number): Item[] {
  const items: Item[] = []
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || IGNORE.has(e.name)) continue
    const full = path.join(dir, e.name)

    if (e.isDirectory()) {
      const children = walk(full, depth + 1)
      if (!children.length) continue
      const meta = dirMeta(full)
      const hasIndex = fs.existsSync(path.join(full, 'index.md'))
      items.push({
        text: meta.title,
        link: hasIndex ? toLink(path.join(full, 'index.md')) : undefined,
        collapsed: false, // 默认展开，仍可手动折叠
        items: children,
        _order: meta.order,
      })
    } else if (depth > 0 && e.name.endsWith('.md') && e.name !== 'index.md') {
      // depth > 0：docs 根目录下的页面（首页、抽题页）不进侧边栏
      const meta = readMeta(full, e.name.replace(/\.md$/, ''))
      items.push({ text: meta.title, link: toLink(full), _order: meta.order })
    }
  }

  return items
    .sort((a, b) => a._order - b._order || a.text!.localeCompare(b.text!, 'zh-CN'))
    .map(({ _order, ...rest }) => rest as Item)
}

export function buildSidebar(): DefaultTheme.SidebarItem[] {
  return walk(DOCS_DIR, 0)
}

/**
 * Dev only: the sidebar is computed once when the config loads, so new or renamed
 * articles would not show up until `npm run dev` is restarted. This plugin recomputes
 * the sidebar whenever a Markdown file is added, removed or changed, and if the result
 * differs, touches config.mts so VitePress restarts the dev server by itself.
 */
export function sidebarAutoReload(): Plugin {
  const configFile = path.join(__dirname, 'config.mts')
  const snapshot = () => {
    try {
      return JSON.stringify(buildSidebar())
    } catch {
      return null // a file may be half-written; try again on the next event
    }
  }

  return {
    name: 'sidebar-auto-reload',
    apply: 'serve',
    configureServer(server) {
      let last = snapshot()
      const onEvent = (file: string) => {
        if (!file.endsWith('.md') || !file.startsWith(DOCS_DIR)) return
        const next = snapshot()
        if (next === null || next === last) return
        last = next
        const now = new Date()
        fs.utimesSync(configFile, now, now)
      }
      server.watcher.on('add', onEvent)
      server.watcher.on('unlink', onEvent)
      server.watcher.on('change', onEvent)
    },
  }
}
