import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { clients } from './clientsController'

type ActivityType = 'call' | 'meeting' | 'proposal' | 'task' | string

type Activity = {
  id: string
  type: string
  description: string
  date: string // ISO
  clientId: string
  userId: string
  organizationId: string
  createdAt: string
  activityStatus: 'scheduled' | 'completed' | 'missed' | 'cancelled'
}

import { loadActivitiesMap, saveActivitiesMap } from '../store/persistence'

// persisted activities store
export const activities = loadActivitiesMap()

// Auto-complete past activities (if scheduled and date is in the past, mark as completed)
export const autoCompleteActivities = () => {
  const now = Date.now()
  let changed = false
  Array.from(activities.values()).forEach(activity => {
    const activityDate = new Date(activity.date).getTime()
    // Mark scheduled activities in the past as completed
    if (activity.activityStatus === 'scheduled' && activityDate < now) {
      activity.activityStatus = 'completed'
      changed = true
    }
  })
  if (changed) saveActivitiesMap(activities)
}

export const createActivity = (req: Request & { user?: any }, res: Response) => {
  const { type, description, date, clientId, customType } = req.body
  if (!type || !date || !clientId) return res.status(400).json({ error: 'Missing fields: type, date, clientId required', received: { type, description, date, clientId } })
  const allowed: ActivityType[] = ['call', 'meeting', 'proposal', 'task']

  // Determine final activity type: allow 'other' with customType or arbitrary non-empty strings
  let finalType: string
  if (type === 'other') {
    if (!customType || !customType.trim()) return res.status(400).json({ error: 'Missing customType for "other" type' })
    finalType = customType.trim()
    if (finalType.length > 50) return res.status(400).json({ error: 'customType too long' })
  } else if (!allowed.includes(type)) {
    // allow arbitrary custom types (trim and basic validation)
    if (typeof type !== 'string' || !type.trim()) return res.status(400).json({ error: 'Invalid type' })
    finalType = type.trim()
  } else {
    finalType = type
  }

  const client = clients.get(clientId)
  if (!client) return res.status(404).json({ error: 'Client not found' })
  // staff can only create activities for clients they own
  if (req.user!.role === 'staff' && client.userId !== req.user!.email) return res.status(403).json({ error: 'Permission denied' })
  const id = uuidv4()
  const userId = req.user!.email
  const organizationId = req.user!.organizationId
  const activity: Activity = { id, type: finalType, description, date: new Date(date).toISOString(), clientId, userId, organizationId, createdAt: new Date().toISOString(), activityStatus: 'scheduled' }
  activities.set(id, activity)
  // persist
  saveActivitiesMap(activities)
  res.status(201).json(activity)
}

export const listActivities = (req: Request & { user?: any }, res: Response) => {
  autoCompleteActivities() // Auto-complete past activities
  const organizationId = req.user!.organizationId
  const clientId = req.query.clientId as string | undefined
  const types = (req.query.types as string | undefined)?.split(',').map(s => s.trim()).filter(Boolean) || []
  const status = (req.query.status as string | undefined) || null
  const q = (req.query.q as string | undefined) || null
  const start = req.query.start ? new Date(req.query.start as string).getTime() : null
  const end = req.query.end ? new Date(req.query.end as string).getTime() : null

  let all = Array.from(activities.values()).filter(a => a.organizationId === organizationId)
  if (clientId) all = all.filter(a => a.clientId === clientId)
  if (types.length) all = all.filter(a => types.includes(a.type))
  if (status) all = all.filter(a => a.activityStatus === status)
  if (start) all = all.filter(a => new Date(a.date).getTime() >= start)
  if (end) all = all.filter(a => new Date(a.date).getTime() <= end)
  if (q) {
    const ql = q.toLowerCase()
    all = all.filter(a => (a.description || '').toLowerCase().includes(ql) || a.type.toLowerCase().includes(ql))
  }

  // staff only see activities they created or for their own clients or for demo clients
  if (req.user!.role === 'staff') {
    all = all.filter(a => a.userId === req.user!.email || (clients.get(a.clientId)?.userId === req.user!.email) || (clients.get(a.clientId)?.demo === true))
  }
  all.sort((a, b) => +new Date(b.date) - +new Date(a.date))
  res.json(all)
}

export const recentActivities = (req: Request & { user?: any }, res: Response) => {
  autoCompleteActivities() // Auto-complete past activities
  const organizationId = req.user!.organizationId
  const limit = parseInt((req.query.limit as string) || '10')
  let all = Array.from(activities.values()).filter(a => a.organizationId === organizationId)
  // staff only see activities they created or for their own clients or for demo clients
  if (req.user!.role === 'staff') {
    all = all.filter(a => a.userId === req.user!.email || (clients.get(a.clientId)?.userId === req.user!.email) || (clients.get(a.clientId)?.demo === true))
  }
  all.sort((a, b) => +new Date(b.date) - +new Date(a.date))
  res.json(all.slice(0, limit))
}

export const updateActivity = (req: Request & { user?: any }, res: Response) => {
  const id = req.params.id
  const existing = activities.get(id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.organizationId !== req.user!.organizationId) return res.status(403).json({ error: 'Forbidden' })
  // staff can only update their own activities
  if (req.user!.role === 'staff' && existing.userId !== req.user!.email) return res.status(403).json({ error: 'Permission denied' })
  const { type, description, date, clientId, customType, activityStatus } = req.body

  if (type) {
    const allowed: ActivityType[] = ['call', 'meeting', 'proposal', 'task']
    if (type === 'other') {
      if (!customType || !customType.trim()) return res.status(400).json({ error: 'Missing customType for "other" type' })
      existing.type = customType.trim()
    } else if (!allowed.includes(type)) {
      if (typeof type !== 'string' || !type.trim()) return res.status(400).json({ error: 'Invalid type' })
      existing.type = type.trim()
    } else {
      existing.type = type
    }
  }
  if (typeof description === 'string') existing.description = description
  if (date) existing.date = new Date(date).toISOString()
  if (clientId) {
    const client = clients.get(clientId)
    if (!client) return res.status(404).json({ error: 'Client not found' })
    existing.clientId = clientId
  }
  if (activityStatus && ['scheduled','completed','missed','cancelled'].includes(activityStatus)) {
    existing.activityStatus = activityStatus
  }
  activities.set(id, existing)
  // persist
  saveActivitiesMap(activities)
  res.json(existing)
}

export const deleteActivity = (req: Request & { user?: any }, res: Response) => {
  const id = req.params.id
  const existing = activities.get(id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.organizationId !== req.user!.organizationId) return res.status(403).json({ error: 'Forbidden' })
  // staff can only delete their own activities
  if (req.user!.role === 'staff' && existing.userId !== req.user!.email) return res.status(403).json({ error: 'Permission denied' })
  activities.delete(id)
  // persist
  saveActivitiesMap(activities)
  res.status(204).send()
}
