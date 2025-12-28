export async function fetchJSON(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('vertex_token')
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string,string> || {})
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  // Use VITE_API_BASE when provided (build-time); otherwise use relative
  // paths so Netlify can proxy `/api/*` to the backend. During local dev set
  // VITE_API_BASE to http://localhost:4000 in an `.env` file if needed.
  const base = import.meta.env.VITE_API_BASE ?? ''
  const resp = await fetch(`${base}${path}`, {
    ...options,
    headers
  })
  if (!resp.ok) throw await resp.json()
  if (resp.status === 204) return null
  return resp.json()
}
