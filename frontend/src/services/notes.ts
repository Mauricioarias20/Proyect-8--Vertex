import { fetchJSON } from './api'

export type Note = { id: string; title: string; body: string; createdAt: string }

export function listNotes() {
  return fetchJSON('/api/notes') as Promise<Note[]>
}

export function createNote(payload: { title?: string; body?: string }) {
  return fetchJSON('/api/notes', { method: 'POST', body: JSON.stringify(payload) }) as Promise<Note>
}

export function deleteNote(id: string) {
  return fetchJSON(`/api/notes/${id}`, { method: 'DELETE' })
}
