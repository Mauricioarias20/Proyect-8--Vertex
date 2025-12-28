export function escapeHtml(s: string) {
  return s.replace(/[&<>\"]+/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'} as any)[m])
}

export function highlightMatch(text: string, q: string) {
  if (!q) return escapeHtml(text)
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')})`, 'ig')
  const parts = escapeHtml(text).split(re)
  return parts.map((p) => {
    if (!p) return ''
    if (re.test(p)) {
      return `<mark style="background:rgba(255,235,59,0.14);padding:2px;border-radius:2px">${p}</mark>`
    }
    return p
  }).join('')
}
