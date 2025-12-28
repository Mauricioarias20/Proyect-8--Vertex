import { fetchJSON } from './api'

export type ClientHealth = { score: number; status: 'Healthy'|'At Risk'|'Inactive'; lastActivityAt?: string | null; daysSinceLast?: number; interactionCount: number; pendingCount: number; ageDays: number }

export type Client = { id: string; name: string; email: string; clientState: 'lead'|'active'|'paused'|'churned'; createdAt: string; lastActivityAt?: string | null; daysSinceLast?: number | null; businessStatus?: 'active' | 'at-risk' | 'inactive'; health?: ClientHealth; archived?: boolean }

export function listClients(params?: { archived?: boolean; state?: string; userId?: string; q?: string }) {
  const qs = new URLSearchParams()
  if (params?.archived) qs.set('archived', 'true')
  if (params?.state) qs.set('state', params.state)
  if (params?.userId) qs.set('userId', params.userId)
  if (params?.q) qs.set('q', params.q)
  const url = '/api/clients' + (qs.toString() ? '?'+qs.toString() : '')
  return fetchJSON(url) as Promise<Client[]>
}

export function createClient(payload: { name: string; email: string; clientState?: string; userId?: string }) {
  return fetchJSON('/api/clients', { method: 'POST', body: JSON.stringify(payload) }) as Promise<Client>
}

export function updateClient(id: string, payload: { name?: string; email?: string; clientState?: string; userId?: string }) {
  return fetchJSON(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) }) as Promise<Client>
}

export function deleteClient(id: string) {
  return fetchJSON(`/api/clients/${id}`, { method: 'DELETE' })
}

export function getAtRiskClients() {
  return fetchJSON('/api/clients/at-risk') as Promise<{ count: number; clients: Client[] }>
}

export type NextAction = { action: string; label: string; score: number; daysSinceLast?: number; lastActivityAt?: string | null }

export function getNextAction(id: string) {
  return fetchJSON(`/api/clients/${id}/next-action`) as Promise<NextAction>
}

export function getClientHealth(id: string) {
  return fetchJSON(`/api/clients/${id}/health`) as Promise<ClientHealth>
}

export function archiveClient(id: string) {
  return fetchJSON(`/api/clients/${id}/archive`, { method: 'POST' }) as Promise<Client>
}

export function unarchiveClient(id: string) {
  return fetchJSON(`/api/clients/${id}/unarchive`, { method: 'POST' }) as Promise<Client>
}

export type TimelineGroup = { key: string; label: string; items: any[] }
export function getTimeline(id: string, params?: { types?: string[]; groupBy?: 'day'|'week'|'none'; start?: string; end?: string; limit?: number; order?: 'asc'|'desc' }) {
  const qs = new URLSearchParams()
  if (params?.types) qs.set('types', params.types.join(','))
  if (params?.groupBy) qs.set('groupBy', params.groupBy)
  if (params?.start) qs.set('start', params.start)
  if (params?.end) qs.set('end', params.end)
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.order) qs.set('order', params.order)
  const url = `/api/clients/${id}/timeline${qs.toString() ? '?'+qs.toString() : ''}`
  return fetchJSON(url) as Promise<{ total: number; groups: TimelineGroup[] }>
}
