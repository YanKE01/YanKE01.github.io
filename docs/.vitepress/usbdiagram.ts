// USB diagrams rendered from fenced code blocks at build time (static HTML, so they also
// show up in quiz answers and search).
//
// ```usbflow                      packet exchange between host and device
// # 第一次事务                     group title
// H IN 地址 5，端点 1               H = host sends, D = device sends; then PID, then note
// D DATA1 64 字节
// H ACK [lost] 在传输中丢失         [lost] draws the packet as lost
// ```
//
// ```usbfields                    packet field layout, one packet per line
// 令牌包: SYNC | PID 8 | ADDR 7 | ENDP 4 | CRC5 5 | EOP
// ```
import type MarkdownIt from 'markdown-it'

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

const PID_KIND: Record<string, string> = {
  OUT: 'token', IN: 'token', SETUP: 'token', SOF: 'token',
  DATA0: 'data', DATA1: 'data', DATA2: 'data', MDATA: 'data',
  ACK: 'ack', NAK: 'nak', STALL: 'stall', NYET: 'nyet',
  PING: 'special',
}

function renderFlow(src: string): string {
  let rows = ''
  for (const raw of src.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    if (line.startsWith('#')) {
      rows += `<div class="uf-group"><span>${esc(line.replace(/^#+\s*/, ''))}</span></div>`
      continue
    }
    const m = line.match(/^([HD])\s+(\S+)\s*(.*)$/)
    if (!m) throw new Error(`无法解析：${line}`)
    const [, who, pid, rest] = m
    const lost = rest.includes('[lost]')
    const note = rest.replace('[lost]', '').trim()
    const kind = PID_KIND[pid.toUpperCase()] ?? 'data'
    const dir = who === 'H' ? 'h2d' : 'd2h'
    rows +=
      `<div class="uf-row uf-${dir} uf-${kind}${lost ? ' uf-lost' : ''}">` +
      `<span class="uf-line"></span>` +
      `<span class="uf-pid">${esc(pid)}</span>` +
      (note ? `<span class="uf-note">${esc(note)}</span>` : '') +
      `</div>`
  }
  return (
    '<div class="usbflow">' +
    '<div class="uf-head"><span>主机 Host</span><span>设备 Device</span></div>' +
    rows +
    '</div>\n'
  )
}

function renderFields(src: string): string {
  let out = '<div class="usbfields">'
  for (const raw of src.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const [label, body] = line.includes(':') ? line.split(/:\s*/, 2) : ['', line]
    out += `<div class="ufd-row">${label ? `<div class="ufd-label">${esc(label)}</div>` : ''}<div class="ufd-fields">`
    for (const f of body.split('|').map((s) => s.trim()).filter(Boolean)) {
      const [name, ...size] = f.split(/\s+/)
      const sizeText = size.join(' ')
      const bits = Number(sizeText)
      const muted = /^(SYNC|EOP)$/.test(name)
      const grow = muted ? 5 : Number.isFinite(bits) && sizeText ? Math.max(bits, 5) : 22
      const cls = muted ? 'muted' : /^PID$/.test(name) ? 'pid' : /^CRC/.test(name) ? 'crc' : /DATA|数据/.test(name) ? 'data' : 'info'
      out +=
        `<div class="ufd-field ufd-${cls}" style="flex-grow:${grow}">` +
        `<span class="ufd-name">${esc(name)}</span>` +
        (sizeText ? `<span class="ufd-size">${esc(Number.isFinite(bits) ? sizeText + ' bit' : sizeText)}</span>` : '') +
        `</div>`
    }
    out += '</div></div>'
  }
  return out + '</div>\n'
}

export function usbDiagramPlugin(md: MarkdownIt) {
  const fallback = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const lang = token.info.trim()
    if (lang !== 'usbflow' && lang !== 'usbfields') return fallback(tokens, idx, options, env, self)
    try {
      return lang === 'usbflow' ? renderFlow(token.content) : renderFields(token.content)
    } catch (e) {
      return (
        '<div class="danger custom-block"><p class="custom-block-title">USB 图解析失败</p>' +
        `<p>${esc(String((e as Error).message))}</p></div>\n`
      )
    }
  }
}
