export function downloadCSV(filename: string, rows: any[], headers?: string[]) {
  const cols = headers ?? (rows.length ? Object.keys(rows[0]) : [])
  const escapeCell = (v: any) => {
    if (v === null || v === undefined) return ''
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v)
    return `"${s.replace(/"/g, '""')}"`
  }

  const csv = [cols.join(',')].concat(rows.map(r => cols.map(c => escapeCell(r[c])).join(','))).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
