// Stable 6-digit hex "document number" derived from the page URL (FNV-1a).
export function docId(url: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return ((h >>> 0) & 0xffffff).toString(16).toUpperCase().padStart(6, '0')
}
