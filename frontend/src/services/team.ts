import { fetchJSON } from './api'

export type Member = { username: string; email: string; role: 'owner'|'manager'|'staff'; organizationId: string; lastActivityAt?: string | null }

export function listTeam() {
  return fetchJSON('/api/team') as Promise<Member[]>
}

export function updateMember(email: string, payload: { role: 'owner'|'manager'|'staff' }) {
  return fetchJSON(`/api/team/${encodeURIComponent(email)}`, { method: 'PUT', body: JSON.stringify(payload) }) as Promise<Member>
}