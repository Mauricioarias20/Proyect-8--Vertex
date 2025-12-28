export async function fetchJSON(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('vertex_token')
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string,string> || {})
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Resolve API base in this order:
  // 1. `VITE_API_BASE` (set at build time in Vercel or locally)
  // 2. If running in a browser and not localhost, default to the
  //    Railway public URL so deployments without env vars still work
  // 3. Otherwise use relative paths (for local dev with dev server proxy)
  const buildBase = import.meta.env.VITE_API_BASE
  const runtimeDefault = (typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.hostname))
    ? 'https://proyect-8-vertex-production.up.railway.app'
    : ''
  const base = buildBase ?? runtimeDefault ?? ''
  const resp = await fetch(`${base}${path}`, {
    ...options,
    headers
  })
  if (!resp.ok) throw await resp.json()
  if (resp.status === 204) return null
  return resp.json()
}
