import { fetchJSON } from './api'

export type ActivityType = 'call' | 'meeting' | 'proposal' | 'task' | string
export type Activity = { id: string; type: string; description: string; date: string; clientId: string; userId: string; createdAt: string; activityStatus: 'scheduled'|'completed'|'missed'|'cancelled' }

export function listActivities(params?: { clientId?: string; types?: string[]; status?: string; start?: string; end?: string; q?: string }) {
  const qs = new URLSearchParams()
  if (params?.clientId) qs.set('clientId', params.clientId)
  if (params?.types) qs.set('types', params.types.join(','))
  if (params?.status) qs.set('status', params.status)
  if (params?.start) qs.set('start', params.start)
  if (params?.end) qs.set('end', params.end)
  if (params?.q) qs.set('q', params.q)
  const s = qs.toString() ? `?${qs.toString()}` : ''
  return fetchJSON(`/api/activities${s}`) as Promise<Activity[]>
}

export function listRecent(limit = 10) {
  return fetchJSON(`/api/activities/recent?limit=${limit}`) as Promise<Activity[]>
}

export function createActivity(payload: { type: ActivityType; description: string; date: string; clientId: string; activityStatus?: string }) {
  return fetchJSON('/api/activities', { method: 'POST', body: JSON.stringify(payload) }) as Promise<Activity>
}

export function updateActivity(id: string, payload: Partial<{ type: ActivityType; description: string; date: string; clientId: string; activityStatus?: string }>) {
  return fetchJSON(`/api/activities/${id}`, { method: 'PUT', body: JSON.stringify(payload) }) as Promise<Activity>
}

export function deleteActivity(id: string) {
  return fetchJSON(`/api/activities/${id}`, { method: 'DELETE' })
}
