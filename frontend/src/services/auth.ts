type AuthResponse = { token: string; user: { username: string; email: string; role?: 'owner'|'member'; organizationId: string } }

function resolveApiBase() {
  let buildBase = import.meta.env.VITE_API_BASE
  if (typeof buildBase === 'string' && /localhost|127\.0\.0\.1/.test(buildBase)) buildBase = undefined
  const runtimeDefault = (typeof window !== 'undefined' && !/localhost|127\.0\.0\.1/.test(window.location.hostname))
    ? 'https://proyect-8-vertex-production.up.railway.app'
    : ''
  return buildBase ?? runtimeDefault ?? ''
}

export async function register(payload: { username: string; email: string; password: string }) {
  const API_BASE = resolveApiBase()
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw await res.json()
  return (await res.json()) as AuthResponse
}

export async function login(payload: { email: string; password: string }) {
  const API_BASE = resolveApiBase()
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw await res.json()
  return (await res.json()) as AuthResponse
}
