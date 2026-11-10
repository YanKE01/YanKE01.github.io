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
//
// ```usbeye                       USB 2.0 high-speed eye template with simulated traces
// tx                              tx = transmit template (Template 1), rx = receive (Template 4),
//                                 tp = where TP1..TP4 are and which template applies there
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

// ---------- usbeye ----------

interface EyeSpec {
  level: number // outer limit, mV
  levelFirst?: number // relaxed limit in the UI right after a transition
  p1: number // % UI of points 1/2 (0 V); point 2 = 100 - p1
  p3: number // % UI of points 3..6; point 4 = 100 - p3
  v3: number // mV of points 3..6
  amp: number // nominal amplitude of the simulated traces, mV
  jitter: number // max crossing offset of the traces, % UI
  noise: number // amplitude spread of the traces, mV
  overshoot: number // overshoot after a transition, fraction of the swing
}

const EYE: Record<string, EyeSpec> = {
  tx: { level: 475, levelFirst: 525, p1: 7.5, p3: 37.5, v3: 300, amp: 400, jitter: 4, noise: 12, overshoot: 0.05 },
  rx: { level: 575, p1: 15, p3: 35, v3: 150, amp: 260, jitter: 9, noise: 30, overshoot: 0.1 },
}

/** Test points TP1..TP4 along the hub -> cable -> device chain, and where each template applies. */
function renderTestPoints(): string {
  const W = 760, H = 330
  const box = (x: number, y: number, w: number, h: number, cls: string, label = '', ty = 0) =>
    `<rect class="${cls}" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>` +
    (label ? `<text class="ue-btext" x="${x + w / 2}" y="${y + (ty || h / 2 + 5)}" text-anchor="middle">${label}</text>` : '')
  const pair = (x1: number, x2: number, cls = 'ue-wire') =>
    `<line class="${cls}" x1="${x1}" y1="112" x2="${x2}" y2="112"/><line class="${cls}" x1="${x1}" y1="122" x2="${x2}" y2="122"/>`
  const tp = (x: number, name: string, where: string) =>
    `<line class="ue-tpline" x1="${x}" y1="58" x2="${x}" y2="176"/>` +
    `<circle class="ue-tpdot" cx="${x}" cy="117" r="5"/>` +
    `<text class="ue-tpname" x="${x}" y="40" text-anchor="middle">${name}</text>` +
    `<text class="ue-small" x="${x}" y="54" text-anchor="middle">${where}</text>`
  // Arrow: dir 1 = to the right, -1 = to the left.
  const arrow = (x1: number, x2: number, yy: number, cls: string, label: string, sub: string) => {
    const dir = x2 > x1 ? 1 : -1
    const head = `${x2},${yy} ${x2 - dir * 9},${yy - 5} ${x2 - dir * 9},${yy + 5}`
    const tx = (x1 + x2) / 2
    return (
      `<line class="${cls}" x1="${x1}" y1="${yy}" x2="${x2 - dir * 8}" y2="${yy}"/>` +
      `<polygon class="${cls}-head" points="${head}"/>` +
      `<text class="${cls}-text" x="${tx}" y="${yy - 8}" text-anchor="middle">${label}</text>` +
      `<text class="ue-small" x="${tx}" y="${yy + 17}" text-anchor="middle">${sub}</text>`
    )
  }
  const svg =
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">` +
    // boards
    box(10, 72, 270, 104, 'ue-board', '电脑主板（主机）', 94) +
    box(480, 72, 270, 104, 'ue-board', 'ESP32-P4 开发板（设备）', 94) +
    box(14, 92, 90, 50, 'ue-chip', 'USB 控制器') +
    box(656, 92, 90, 50, 'ue-chip', 'ESP32-P4') +
    // traces, connectors, cable
    pair(104, 252) + pair(508, 656) + box(590, 106, 30, 22, 'ue-esd', 'ESD', 0) +
    `<text class="ue-small" x="178" y="104" text-anchor="middle">PCB 走线</text>` +
    `<text class="ue-small" x="550" y="104" text-anchor="middle">PCB 走线</text>` +
    box(252, 100, 28, 34, 'ue-conn') + box(480, 100, 28, 34, 'ue-conn') +
    pair(280, 480, 'ue-cable') +
    `<text class="ue-small" x="380" y="104" text-anchor="middle">USB 线缆（最长 5 m）</text>` +
    `<text class="ue-small" x="380" y="142" text-anchor="middle">D+ / D− 差分对</text>` +
    // test points
    tp(104, 'TP1', '控制器引脚') + tp(266, 'TP2', 'USB-A 插座') + tp(494, 'TP3', 'Type-C 插座') + tp(656, 'TP4', 'P4 的 D+/D− 引脚') +
    // where the templates apply
    arrow(108, 262, 210, 'ue-tx', '电脑发送：在 USB-A 口测量', '须满足 Template 1') +
    arrow(266, 108, 270, 'ue-rx', '电脑接收：从 USB-A 口加入信号', '劣化到 Template 4 仍须能收') +
    arrow(652, 498, 210, 'ue-tx', 'P4 发送：在 Type-C 口测量', '须满足 Template 1') +
    arrow(494, 652, 270, 'ue-rx', 'P4 接收：从 Type-C 口加入信号', '劣化到 Template 4 仍须能收') +
    `<text class="ue-small" x="${W / 2}" y="${H - 6}" text-anchor="middle">测量点都在插座处：插座以内的走线、ESD 器件算作被测设备的一部分</text>` +
    `</svg>`
  return `<div class="usbeye">${svg}</div>\n`
}

function renderEye(src: string): string {
  const kind = src.trim().toLowerCase()
  if (kind === 'tp') return renderTestPoints()
  const e = EYE[kind]
  if (!e) throw new Error(`usbeye 只支持 tx、rx 或 tp：${src.trim()}`)

  const X0 = 125, PX = 4.2 // x of 0 % UI, px per % UI
  const Y0 = 190, PY = 0.25 // y of 0 mV, px per mV
  const x = (p: number) => +(X0 + p * PX).toFixed(1)
  const y = (mv: number) => +(Y0 - mv * PY).toFixed(1)
  const W = 735, H = 400

  // Deterministic pseudo-random numbers so builds are reproducible.
  let seed = kind === 'tx' ? 7 : 11
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1

  // One trace over [-12 %, 112 %] UI: previous bit, current bit, next bit.
  const SPAN = 26 // transition length, % UI
  const edge = (t: number, c: number, from: number, to: number) => {
    const s = Math.min(1, Math.max(0, (t - c) / SPAN + 0.5))
    let v = from + (to - from) * (0.5 - 0.5 * Math.cos(Math.PI * s))
    const after = t - (c + SPAN / 2)
    if (after > 0) v += (to - from) * e.overshoot * Math.exp(-after / 14) * Math.cos(after / 9)
    return v
  }
  let traces = ''
  for (let pattern = 0; pattern < 8; pattern++) {
    const bits = [pattern & 4, pattern & 2, pattern & 1].map((b) => (b ? 1 : -1))
    for (let k = 0; k < 4; k++) {
      const a = e.amp + rnd() * e.noise
      const c0 = rnd() * e.jitter, c1 = 100 + rnd() * e.jitter
      const pts: string[] = []
      for (let t = -12; t <= 112; t += 2) {
        let v = bits[0] * a
        if (bits[1] !== bits[0]) v = edge(t, c0, bits[0] * a, bits[1] * a)
        else v = bits[1] * a
        if (t > 50 && bits[2] !== bits[1]) v = edge(t, c1, bits[1] * a, bits[2] * a)
        pts.push(`${x(t)},${y(v)}`)
      }
      traces += `<polyline class="ue-trace" points="${pts.join(' ')}"/>`
    }
  }

  const hex = [
    [e.p1, 0], [e.p3, e.v3], [100 - e.p3, e.v3], [100 - e.p1, 0], [100 - e.p3, -e.v3], [e.p3, -e.v3],
  ]
  const hexPts = hex.map(([p, v]) => `${x(p)},${y(v)}`).join(' ')
  const labels: [number, string][] = [[0, '1'], [3, '2'], [1, '3'], [2, '4'], [5, '5'], [4, '6']]
  let points = ''
  for (const [i, name] of labels) {
    const [p, v] = hex[i]
    const dx = i === 0 ? -14 : i === 3 ? 14 : 0
    const dy = v > 0 ? -10 : v < 0 ? 20 : 4
    points +=
      `<circle class="ue-point" cx="${x(p)}" cy="${y(v)}" r="3.5"/>` +
      `<text class="ue-plabel" x="${x(p) + dx}" y="${y(v) + dy}" text-anchor="middle">${name}</text>`
  }

  const L = e.level, LF = e.levelFirst
  const xl = x(-12), xr = x(112)
  const band = (v: number, sign: 1 | -1) =>
    `<rect class="ue-out" x="${xl}" y="${sign > 0 ? 20 : y(-v)}" width="${xr - xl}" height="${sign > 0 ? y(v) - 20 : 2 * Y0 - 20 - y(-v)}"/>`
  const lvl = (v: number, cls: string) =>
    `<line class="${cls}" x1="${xl}" y1="${y(v)}" x2="${xr}" y2="${y(v)}"/>`
  const lvlText = (v: number, name: string) => {
    const sign = v > 0 ? '+' : '−'
    const base = v > 0 ? (LF ? 14 : y(v) - 34) : y(-(LF ?? -v)) + 16
    return (
      `<text class="ue-ltext" x="${xr + 8}" y="${base}">${name}</text>` +
      `<text class="ue-small" x="${xr + 8}" y="${base + 15}">${LF ? '实线：' : ''}${sign}${Math.abs(v)} mV</text>` +
      (LF ? `<text class="ue-small" x="${xr + 8}" y="${base + 30}">虚线：${sign}${LF} mV</text>` +
        `<text class="ue-small" x="${xr + 8}" y="${base + 45}">（跳变后首个 UI）</text>` : '')
    )
  }

  let ticks = ''
  const tickSet = [0, e.p1, e.p3, 100 - e.p3, 100 - e.p1, 100]
  for (const p of tickSet) {
    ticks +=
      `<line class="ue-grid" x1="${x(p)}" y1="${y(0) - 4}" x2="${x(p)}" y2="${2 * Y0 - 20}"/>` +
      `<text class="ue-small" x="${x(p)}" y="${2 * Y0 - 4 + (p === 0 || p === 100 ? 14 : 0)}" text-anchor="middle">${p}%</text>`
  }
  let yAxis = ''
  // Level 1/2 values on the left axis, in the mask colour.
  for (const v of [L, -L, ...(LF ? [LF, -LF] : [])]) {
    const up = Math.abs(v) === LF ? (v > 0 ? -3 : 9) : v > 0 ? 9 : -1 // keep 475/525 labels apart
    yAxis += `<text class="ue-ltick" x="${X0 - 60}" y="${y(v) + up}" text-anchor="end">${v > 0 ? '+' : '−'}${Math.abs(v)} mV</text>` +
      `<line class="ue-level${Math.abs(v) === LF ? ' ue-dash' : ''}" x1="${X0 - 56}" y1="${y(v)}" x2="${xl}" y2="${y(v)}"/>`
  }
  for (const v of [e.v3, 0, -e.v3]) {
    yAxis += `<text class="ue-small" x="${X0 - 60}" y="${y(v) + 4}" text-anchor="end">${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} mV</text>` +
      `<line class="ue-grid" x1="${X0 - 58}" y1="${y(v)}" x2="${x(e.p3)}" y2="${y(v)}"/>`
  }

  const svg =
    `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img">` +
    band(L, 1) + band(L, -1) +
    ticks + yAxis +
    `<line class="ue-axis" x1="${xl}" y1="${y(0)}" x2="${xr}" y2="${y(0)}"/>` +
    traces +
    `<polygon class="ue-hex" points="${hexPts}"/>` +
    lvl(L, 'ue-level') + lvl(-L, 'ue-level') +
    (LF ? lvl(LF, 'ue-level ue-dash') + lvl(-LF, 'ue-level ue-dash') : '') +
    points +
    lvlText(L, 'Level 1') +
    lvlText(-L, 'Level 2') +
    `<text class="ue-small" x="${(x(0) + x(100)) / 2}" y="${H - 6}" text-anchor="middle">时间（1 UI = 1/480 MHz ≈ 2.08 ns）</text>` +
    `<text class="ue-small" x="8" y="14">差分电压 V(D+) − V(D−)</text>` +
    `</svg>`
  return `<div class="usbeye">${svg}</div>\n`
}

export function usbDiagramPlugin(md: MarkdownIt) {
  const fallback = md.renderer.rules.fence!
  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const token = tokens[idx]
    const lang = token.info.trim()
    const render = { usbflow: renderFlow, usbfields: renderFields, usbeye: renderEye }[lang]
    if (!render) return fallback(tokens, idx, options, env, self)
    try {
      return render(token.content)
    } catch (e) {
      return (
        '<div class="danger custom-block"><p class="custom-block-title">USB 图解析失败</p>' +
        `<p>${esc(String((e as Error).message))}</p></div>\n`
      )
    }
  }
}
