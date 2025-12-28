import { Request, Response } from 'express'
import { clients } from './clientsController'
import { activities } from './activitiesController'
import { notes } from './notesController'

// simple global search
export const globalSearch = (req: Request & { user?: any }, res: Response) => {
  const q = String(req.query.q || '').trim().toLowerCase()
  if (!q) return res.json([])
  const organizationId = req.user!.organizationId

  const results: any[] = []

  // search clients
  Array.from(clients.values()).forEach(c => {
    if (c.organizationId !== organizationId) return
    const hay = `${c.name} ${c.email}`.toLowerCase()
    if (hay.includes(q)) {
      results.push({ type: 'client', id: c.id, title: c.name, snippet: c.email, createdAt: c.createdAt })
    }
  })

  // search activities
  Array.from(activities.values()).forEach(a => {
    if (a.organizationId !== organizationId) return
    const hay = `${a.type} ${a.description}`.toLowerCase()
    if (hay.includes(q)) {
      results.push({ type: 'activity', id: a.id, title: a.type, snippet: a.description, date: a.date, clientId: a.clientId })
    }
  })

  // search notes
  Array.from(notes.values()).forEach(n => {
    if (n.organizationId !== organizationId) return
    const hay = `${n.title} ${n.body}`.toLowerCase()
    if (hay.includes(q)) {
      results.push({ type: 'note', id: n.id, title: n.title || n.body.slice(0,40), snippet: n.body, createdAt: n.createdAt })
    }
  })

  // sort by createdAt / date descending
  results.sort((a,b) => {
    const at = a.date || a.createdAt || ''
    const bt = b.date || b.createdAt || ''
    return +new Date(bt) - +new Date(at)
  })

  res.json(results)
}
