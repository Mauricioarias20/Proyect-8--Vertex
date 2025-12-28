export async function fetchJSON(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('vertex_token')
  const headers: Record<string,string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string,string> || {})
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const resp = await fetch(`${import.meta.env.VITE_API_BASE || 'http://localhost:4000'}${path}`, {
    ...options,
    headers
  })
  if (!resp.ok) throw await resp.json()
  if (resp.status === 204) return null
  return resp.json()
}
