// Render ```wavedrom fenced code blocks to SVG at build time.
// Each diagram is embedded as an <img> data URI, which keeps WaveDrom's global <style>
// and element ids isolated per diagram. Dark mode is handled with a CSS filter.
//
// Skins: set `config: { skin: 'narrow' }` in the diagram for a compact layout.
import { createRequire } from 'node:module'
import JSON5 from 'json5'
import type MarkdownIt from 'markdown-it'

const require = createRequire(import.meta.url)
const wavedrom = require('wavedrom')
const skins = {
  ...require('wavedrom/skins/default.js'),
  ...require('wavedrom/skins/narrow.js'),
  ...require('wavedrom/skins/lowkey.js'),
}

let counter = 0

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

export function wavedromPlugin(md: MarkdownIt) {
  const fallback = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    if (token.info.trim() !== 'wavedrom') return fallback(tokens, idx, options, env, self)

    try {
      const source = JSON5.parse(token.content)
      const svg = wavedrom.onml.stringify(wavedrom.renderAny(counter++, source, skins))
      const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
      return `<div class="wavedrom"><img alt="时序图" src="${src}"></div>\n`
    } catch (e) {
      return (
        '<div class="danger custom-block"><p class="custom-block-title">WaveDrom 波形解析失败</p>' +
        `<p>${escapeHtml(String((e as Error).message))}</p></div>\n`
      )
    }
  }
}
