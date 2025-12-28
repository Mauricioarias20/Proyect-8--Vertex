import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

type Note = { id: string; title: string; body: string; userId: string; organizationId: string; createdAt: string }

export const notes = new Map<string, Note>()

export const createNote = (req: Request & { user?: any }, res: Response) => {
  const { title, body } = req.body
  if (!title && !body) return res.status(400).json({ error: 'Missing fields' })
  const id = uuidv4()
  const userId = req.user!.email
  const organizationId = req.user!.organizationId
  const note = { id, title: title || '', body: body || '', userId, organizationId, createdAt: new Date().toISOString() }
  notes.set(id, note)
  res.status(201).json(note)
}

export const listNotes = (req: Request & { user?: any }, res: Response) => {
  const organizationId = req.user!.organizationId
  const all = Array.from(notes.values()).filter(n => n.organizationId === organizationId)
  res.json(all)
}

export const deleteNote = (req: Request & { user?: any }, res: Response) => {
  const id = req.params.id
  const existing = notes.get(id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.organizationId !== req.user!.organizationId) return res.status(403).json({ error: 'Forbidden' })
  notes.delete(id)
  res.status(204).send()
}
