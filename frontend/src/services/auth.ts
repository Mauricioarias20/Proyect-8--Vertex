type AuthResponse = { token: string; user: { username: string; email: string; role?: 'owner'|'member'; organizationId: string } }

// Default to backend origin when VITE_API_BASE is not set (dev convenience)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000'

export async function register(payload: { username: string; email: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw await res.json()
  return (await res.json()) as AuthResponse
}

export async function login(payload: { email: string; password: string }) {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw await res.json()
  return (await res.json()) as AuthResponse
}
