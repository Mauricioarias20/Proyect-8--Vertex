import { fetchJSON } from './api'

export type SearchItem = { type: 'client'|'activity'|'note'; id: string; title: string; snippet?: string; clientId?: string }

export function search(q: string) {
  return fetchJSON(`/api/search?q=${encodeURIComponent(q)}`) as Promise<SearchItem[]>
}
