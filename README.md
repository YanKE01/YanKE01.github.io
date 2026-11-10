# Study Notes

**English** | [简体中文](READMEZH.md)

A personal study-notes blog built with [VitePress](https://vitepress.dev), featuring category-based organization and a random Q&A quiz.

## Local Preview

```bash
npm install     # first time only
npm run dev     # open http://localhost:5173 for live preview
```

## Writing Notes

All notes live under `docs/`:

```
docs/
└── peripheral/       ← one folder = one category
    ├── index.md      ← optional: its `title` is used as the category name (defaults to the folder name)
    └── i2c.md        ← one .md file = one article
```

- **New category**: create a new folder. Sub-folders become sub-categories.
- **Title**: taken from the frontmatter `title`, otherwise from the first `# Heading` in the body.
- **Date**: add `date: 2026-11-10` to the frontmatter; the home page lists articles from newest to oldest.
- **Summary**: the home page shows the first paragraph of the article; set `description` in the frontmatter to override it.
- **Order**: add `order: 1` to the frontmatter (smaller comes first); otherwise sorted by name.
- When articles are added, removed, or their title/order changes, `npm run dev` restarts itself to refresh the sidebar (takes a few seconds); content edits are applied live.

### Q&A Format (collected into the random quiz)

```markdown
## Q: Write the question here?

Write the answer here using any Markdown: lists, code blocks, tables, images...
Everything up to the next level-2 heading is treated as the answer.
```

Rule: **every level-2 heading starting with `Q:` (or the full-width `Q：`) is a question**. Other headings are not added to the quiz.

### Timing Diagrams (WaveDrom)

Describe waveforms in a `wavedrom` code block; they are rendered to images at build time:

````markdown
```wavedrom
{
  signal: [
    { name: 'SCL', wave: '1.0.1.' },
    { name: 'SDA', wave: '10...1' },
  ],
}
```
````

Common characters: `0`/`1` low/high level, `.` keep the previous state, `p`/`n` clock, `3`–`9` labeled data blocks (labels go in `data`).
Syntax and online editor: <https://wavedrom.com/tutorial.html>, <https://wavedrom.com/editor.html> (tune the diagram online, then paste it in).

Notes:

- String concatenation with `+` is not supported; write each wave as a single complete string.
- Use **uppercase letters** for helper `node`s used by arrows; lowercase node letters are drawn on the diagram.
- For diagrams with many pulses, add `config: { skin: 'narrow' }` to reduce the width.

Vendor specifications and application notes can be kept in `references/` at the repository root for local reading. This folder is git-ignored and is not published, because these documents are copyrighted; link to the official URLs in articles instead.

### USB Packet Diagrams

Use a `usbflow` code block for host–device packet exchanges and `usbfields` for packet field layouts:

````markdown
```usbflow
# group title
H IN address 5, endpoint 1   ← H = sent by host, D = sent by device; then PID and a note
D DATA1 device sends data
H ACK [lost] lost in transit  ← [lost] draws the packet as lost (dashed)
```

```usbfields
Token: SYNC | PID 8 | ADDR 7 | ENDP 4 | CRC5 5 | EOP
```
````

PIDs are colored automatically: token blue, data amber, ACK green, NAK orange, STALL red, NYET purple, PING cyan.

Put images in `docs/public/` and reference them as `![description](/image-name.png)`.

## Deploying to GitHub Pages

1. Create a repository on GitHub and push the code (branch `main`).
   - Repository named `<username>.github.io` → site URL is `https://<username>.github.io/`
   - Any other name (e.g. `blog`) → site URL is `https://<username>.github.io/blog/`
2. In the repository, go to **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Every `git push` then builds and publishes the site automatically (about 1–2 minutes).

## Customization

- Site title, description and navigation: `title`, `description` and `nav` in `docs/.vitepress/config.mts`
- Theme color: `docs/.vitepress/theme/style.css`
- Home page cover image: put the image in `docs/public/` and uncomment the `cover` line in `config.mts`
