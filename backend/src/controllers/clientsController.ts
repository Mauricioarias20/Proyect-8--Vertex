import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

import { loadClientsMap, saveClientsMap } from '../store/persistence'

type Client = {
  id: string
  name: string
  email: string
  clientState: 'lead' | 'active' | 'paused' | 'churned'
  createdAt: string
  userId: string
  organizationId: string
  archived?: boolean
}

// persisted store (simple JSON file)
export const clients = loadClientsMap()

export const createClient = (req: Request & { user?: any }, res: Response) => {
  const { name, email, status } = req.body
  if (!name || !email) return res.status(400).json({ error: 'Missing fields' })
  const id = uuidv4()
  const userId = req.user!.email
  const organizationId = req.user!.organizationId
  const client: Client = { id, name, email, clientState: 'lead', createdAt: new Date().toISOString(), userId, organizationId, archived: false }
  clients.set(id, client)
  // persist
  saveClientsMap(clients)
  // new client -> treat creation as last activity reference
  const daysSinceLast = 0
  const businessStatus: 'active' = 'active'
  res.status(201).json({ ...client, lastActivityAt: client.createdAt, daysSinceLast, businessStatus })
}

export const listClients = (req: Request & { user?: any }, res: Response) => {
  const organizationId = req.user!.organizationId
  let all = Array.from(clients.values()).filter(c => c.organizationId === organizationId)

  // Filter archived vs active (default: show non-archived)
  const archivedQuery = (req.query.archived as string | undefined)
  const wantArchived = archivedQuery === 'true'
  all = all.filter(c => Boolean((c as any).archived) === wantArchived)

  // staff users only see clients assigned to them OR demo clients (for demo mode)
  if (req.user!.role === 'staff') {
    all = all.filter(c => c.userId === req.user!.email || (c as any).demo === true)
  }

  // Filter by optional query params: state, userId, q (search)
  const clientState = (req.query.state as string | undefined) || null
  const userId = (req.query.userId as string | undefined) || null
  const q = (req.query.q as string | undefined) || null

  if (clientState) all = all.filter(c => c.clientState === clientState)
  if (userId) all = all.filter(c => c.userId === userId)
  if (q) {
    const ql = q.toLowerCase()
    all = all.filter(c => c.name.toLowerCase().includes(ql) || c.email.toLowerCase().includes(ql))
  }

  // compute last activity and business status per client
  const now = Date.now()
  const ACTIVITY_MS = 24 * 60 * 60 * 1000

  const enriched = all.map(c => {
    // require activities dynamically to avoid circular import issues
    const { activities } = require('./activitiesController') as { activities: Map<string, any> }
    const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === organizationId && a.clientId === c.id)
    const last = acts.length ? acts.map((a: any) => +new Date(a.date)).sort((x: number, y: number) => y - x)[0] : null
    const lastActivityAt = last ? new Date(last).toISOString() : null
    const reference = last ? last : new Date(c.createdAt).getTime()
    const daysSinceLast = Math.round((now - reference) / ACTIVITY_MS)

    let businessStatus: 'active' | 'at-risk' | 'inactive' = 'active'
    if (daysSinceLast <= 14) businessStatus = 'active'
    else if (daysSinceLast <= 30) businessStatus = 'at-risk'
    else businessStatus = 'inactive'

    const health = computeClientHealth(c, organizationId)

    return { ...c, lastActivityAt, daysSinceLast, businessStatus, health }
  })

  res.json(enriched)
}

export const updateClient = (req: Request & { user?: any }, res: Response) => {
  const id = req.params.id
  const existing = clients.get(id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.organizationId !== req.user!.organizationId) return res.status(403).json({ error: 'Forbidden' })
  const { name, email, clientState, userId } = req.body
  existing.name = name ?? existing.name
  existing.email = email ?? existing.email
  if (clientState && ['lead','active','paused','churned'].includes(clientState)) existing.clientState = clientState
  // allow owner/manager to reassign client to another user in the org
  if (userId) {
    // only owner/manager may reassign a client
    if (req.user!.role === 'staff') return res.status(403).json({ error: 'Permission denied' })
    const { users } = require('./authController') as { users: Map<string, any> }
    const target = users.get(userId)
    if (!target || target.organizationId !== req.user!.organizationId) return res.status(400).json({ error: 'Invalid userId' })
    existing.userId = userId
  }
  clients.set(id, existing)
  // persist
  saveClientsMap(clients)

  // recompute lastActivity and business status for response
  const { activities } = require('./activitiesController') as { activities: Map<string, any> }
  const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === req.user!.organizationId && a.clientId === existing.id)
  const last = acts.length ? acts.map((a: any) => +new Date(a.date)).sort((x: number, y: number) => y - x)[0] : null
  const lastActivityAt = last ? new Date(last).toISOString() : null
  const daysSinceLast = Math.round((Date.now() - (last ? last : new Date(existing.createdAt).getTime())) / (24*60*60*1000))
  let businessStatus: 'active' | 'at-risk' | 'inactive' = 'active'
  if (daysSinceLast <= 14) businessStatus = 'active'
  else if (daysSinceLast <= 30) businessStatus = 'at-risk'
  else businessStatus = 'inactive'

  res.json({ ...existing, lastActivityAt, daysSinceLast, businessStatus })
}

export const deleteClient = (req: Request & { user?: any }, res: Response) => {
  const id = req.params.id
  const existing = clients.get(id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.organizationId !== req.user!.organizationId) return res.status(403).json({ error: 'Forbidden' })
  clients.delete(id)
  // persist
  saveClientsMap(clients)
  res.status(204).send()
}

export const archiveClient = (req: Request & { user?: any }, res: Response) => {
  const id = req.params.id
  const existing = clients.get(id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.organizationId !== req.user!.organizationId) return res.status(403).json({ error: 'Forbidden' })
  existing.archived = true
  clients.set(id, existing)
  saveClientsMap(clients)

  // recompute lastActivity and business status for response
  const { activities } = require('./activitiesController') as { activities: Map<string, any> }
  const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === req.user!.organizationId && a.clientId === existing.id)
  const last = acts.length ? acts.map((a: any) => +new Date(a.date)).sort((x: number, y: number) => y - x)[0] : null
  const lastActivityAt = last ? new Date(last).toISOString() : null
  const daysSinceLast = Math.round((Date.now() - (last ? last : new Date(existing.createdAt).getTime())) / (24*60*60*1000))
  let businessStatus: 'active' | 'at-risk' | 'inactive' = 'active'
  if (daysSinceLast <= 14) businessStatus = 'active'
  else if (daysSinceLast <= 30) businessStatus = 'at-risk'
  else businessStatus = 'inactive'

  res.json({ ...existing, lastActivityAt, daysSinceLast, businessStatus })
}

export const unarchiveClient = (req: Request & { user?: any }, res: Response) => {
  const id = req.params.id
  const existing = clients.get(id)
  if (!existing) return res.status(404).json({ error: 'Not found' })
  if (existing.organizationId !== req.user!.organizationId) return res.status(403).json({ error: 'Forbidden' })
  existing.archived = false
  clients.set(id, existing)
  saveClientsMap(clients)

  const { activities } = require('./activitiesController') as { activities: Map<string, any> }
  const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === req.user!.organizationId && a.clientId === existing.id)
  const last = acts.length ? acts.map((a: any) => +new Date(a.date)).sort((x: number, y: number) => y - x)[0] : null
  const lastActivityAt = last ? new Date(last).toISOString() : null
  const daysSinceLast = Math.round((Date.now() - (last ? last : new Date(existing.createdAt).getTime())) / (24*60*60*1000))
  let businessStatus: 'active' | 'at-risk' | 'inactive' = 'active'
  if (daysSinceLast <= 14) businessStatus = 'active'
  else if (daysSinceLast <= 30) businessStatus = 'at-risk'
  else businessStatus = 'inactive'

  res.json({ ...existing, lastActivityAt, daysSinceLast, businessStatus })
}

export const getAtRiskClients = (req: Request & { user?: any }, res: Response) => {
  const organizationId = req.user!.organizationId
  let all = Array.from(clients.values()).filter(c => c.organizationId === organizationId)

  // staff users only see their assigned clients or demo clients
  if (req.user!.role === 'staff') all = all.filter(c => c.userId === req.user!.email || (c as any).demo === true)

  const now = Date.now()
  const ACTIVITY_MS = 24 * 60 * 60 * 1000
  const AT_RISK_DAYS = 14 // 14 days without activity = at risk
  const INACTIVE_DAYS = 30  // 30 days without activity = inactive

  const { activities } = require('./activitiesController') as { activities: Map<string, any> }

  const atRisk = all.filter(c => {
    const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === organizationId && a.clientId === c.id)
    const last = acts.length ? acts.map((a: any) => +new Date(a.date)).sort((x: number, y: number) => y - x)[0] : null
    const reference = last ? last : new Date(c.createdAt).getTime()
    const daysSinceLast = Math.round((now - reference) / ACTIVITY_MS)
    
    // At risk: 14-30 days without activity
    return daysSinceLast > AT_RISK_DAYS && daysSinceLast <= INACTIVE_DAYS
  }).map(c => {
    const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === organizationId && a.clientId === c.id)
    const last = acts.length ? acts.map((a: any) => +new Date(a.date)).sort((x: number, y: number) => y - x)[0] : null
    const lastActivityAt = last ? new Date(last).toISOString() : null
    const reference = last ? last : new Date(c.createdAt).getTime()
    const daysSinceLast = Math.round((now - reference) / ACTIVITY_MS)
    return { ...c, lastActivityAt, daysSinceLast, businessStatus: 'at-risk' as const }
  })

  res.json({ count: atRisk.length, clients: atRisk })
}

// Compute client health score and status
export const computeClientHealth = (client: Client, organizationId: string) => {
  const { activities } = require('./activitiesController') as { activities: Map<string, any> }
  const now = Date.now()
  const MS_DAY = 24*60*60*1000
  const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === organizationId && a.clientId === client.id)

  // last activity
  const last = acts.length ? acts.map((a: any) => +new Date(a.date)).sort((x: number, y: number) => y - x)[0] : null
  const lastActivityAt = last ? new Date(last).toISOString() : null
  const daysSinceLast = Math.round((now - (last ? last : new Date(client.createdAt).getTime())) / MS_DAY)

  // interaction count: activities in last 90 days
  const window90 = now - (90 * MS_DAY)
  const interactionCount = acts.filter((a: any) => +new Date(a.date) >= window90).length

  // pending / scheduled future activities
  const pendingCount = acts.filter((a: any) => a.activityStatus === 'scheduled' && +new Date(a.date) > now).length

  // age (since created)
  const ageDays = Math.round((now - new Date(client.createdAt).getTime()) / MS_DAY)

  // Scoring components (0..1)
  const recencyScore = (() => {
    if (daysSinceLast <= 7) return 1
    if (daysSinceLast <= 14) return 0.9
    if (daysSinceLast <= 30) return 0.75
    if (daysSinceLast <= 60) return 0.5
    if (daysSinceLast <= 90) return 0.3
    return 0.1
  })()

  const interactionScore = (() => {
    if (interactionCount >= 10) return 1
    if (interactionCount >= 5) return 0.8
    if (interactionCount >= 3) return 0.6
    if (interactionCount >= 1) return 0.3
    return 0
  })()

  const pendingScore = Math.min(1, pendingCount / 3)

  const ageScore = Math.max(0.7, 1 - (ageDays / 365) * 0.3) // new clients slightly favored

  // weights
  const score = Math.round(100 * (0.4 * recencyScore + 0.25 * interactionScore + 0.2 * pendingScore + 0.15 * ageScore))

  let status: 'Healthy' | 'At Risk' | 'Inactive' = 'At Risk'
  if (daysSinceLast > 30 || client.clientState === 'churned') status = 'Inactive'
  else if (score >= 70) status = 'Healthy'
  else if (score < 40) status = 'Inactive'
  else status = 'At Risk'

  return { score, status, lastActivityAt, daysSinceLast, interactionCount, pendingCount, ageDays }
}

// GET /api/clients/:id/health
export const getClientHealth = (req: Request & { user?: any }, res: Response) => {
  const organizationId = req.user!.organizationId
  const id = req.params.id
  const client = clients.get(id)
  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (client.organizationId !== organizationId) return res.status(403).json({ error: 'Forbidden' })

  const health = computeClientHealth(client, organizationId)
  res.json(health)
}

// GET /api/clients/:id/timeline
export const getClientTimeline = (req: Request & { user?: any }, res: Response) => {
  const organizationId = req.user!.organizationId
  const id = req.params.id
  const client = clients.get(id)
  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (client.organizationId !== organizationId) return res.status(403).json({ error: 'Forbidden' })

  const { activities } = require('./activitiesController') as { activities: Map<string, any> }
  let acts = Array.from(activities.values()).filter((a: any) => a.organizationId === organizationId && a.clientId === id)

  // visibility: staff only see activities they created or for their own clients
  if (req.user!.role === 'staff') {
    acts = acts.filter(a => a.userId === req.user!.email || client.userId === req.user!.email)
  }

  // query params: types=call,meeting  groupBy=day|week|none  start=ISO end=ISO limit=100 order=asc|desc
  const types = (req.query.types as string | undefined)?.split(',').map(s => s.trim()).filter(Boolean) || []
  const groupBy = (req.query.groupBy as string | undefined) || 'day'
  const start = req.query.start ? new Date(req.query.start as string).getTime() : null
  const end = req.query.end ? new Date(req.query.end as string).getTime() : null
  const limit = Math.min(500, parseInt((req.query.limit as string) || '200'))
  const order = (req.query.order as string | undefined) === 'asc' ? 'asc' : 'desc'

  if (types.length) acts = acts.filter(a => types.includes(a.type))
  if (start) acts = acts.filter(a => new Date(a.date).getTime() >= start)
  if (end) acts = acts.filter(a => new Date(a.date).getTime() <= end)

  acts.sort((a: any, b: any) => order === 'asc' ? +new Date(a.date) - +new Date(b.date) : +new Date(b.date) - +new Date(a.date))
  if (limit) acts = acts.slice(0, limit)

  // grouping helpers
  const getWeekKey = (t: number) => {
    const d = new Date(t)
    // ISO week number algorithm
    const target = new Date(d.valueOf())
    const dayNr = (d.getDay() + 6) % 7
    target.setDate(target.getDate() - dayNr + 3)
    const firstThursday = target.valueOf()
    const yearStart = new Date(target.getFullYear(),0,1).valueOf()
    const weekNum = Math.round(((firstThursday - yearStart) / 86400000 + 1) / 7)
    return `${target.getFullYear()}-W${String(weekNum).padStart(2,'0')}`
  }

  const grouped: Array<{ key: string; label: string; items: any[] }> = []
  if (groupBy === 'none') {
    grouped.push({ key: 'all', label: 'All', items: acts })
  } else if (groupBy === 'week') {
    const map = new Map<string, any[]>()
    acts.forEach(a => {
      const key = getWeekKey(new Date(a.date).getTime())
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    })
    Array.from(map.entries()).forEach(([k, items]) => grouped.push({ key: k, label: k, items }))
    // sort groups by key (desc)
    grouped.sort((x,y)=> y.key.localeCompare(x.key))
  } else {
    // day grouping by ISO date
    const map = new Map<string, any[]>()
    acts.forEach(a => {
      const key = new Date(a.date).toISOString().slice(0,10)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(a)
    })
    Array.from(map.entries()).forEach(([k, items]) => grouped.push({ key: k, label: k, items }))
    grouped.sort((x,y)=> y.key.localeCompare(x.key))
  }

  res.json({ total: acts.length, groups: grouped })
}

// GET /api/clients/:id/next-action
export const getNextAction = (req: Request & { user?: any }, res: Response) => {
  const organizationId = req.user!.organizationId
  const id = req.params.id
  const client = clients.get(id)
  if (!client) return res.status(404).json({ error: 'Client not found' })
  if (client.organizationId !== organizationId) return res.status(403).json({ error: 'Forbidden' })

  const { activities } = require('./activitiesController') as { activities: Map<string, any> }
  const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === organizationId && a.clientId === id)
  acts.sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date))

  const now = Date.now()
  const last = acts.length ? acts[0] : null
  const lastActivityAt = last ? new Date(last.date).toISOString() : null
  const reference = last ? new Date(last.date).getTime() : new Date(client.createdAt).getTime()
  const daysSinceLast = Math.round((now - reference) / (24*60*60*1000))

  // Upcoming scheduled activity takes precedence
  const upcoming = acts.find((a: any) => a.activityStatus === 'scheduled' && new Date(a.date).getTime() > now)
  if (upcoming) {
    return res.json({ action: 'prepare_meeting', label: `Prepare for ${upcoming.type} on ${new Date(upcoming.date).toLocaleDateString()}`, score: 0.95, daysSinceLast, lastActivityAt })
  }

  // Heuristic rules
  if (client.clientState === 'lead' && daysSinceLast <= 7) {
    return res.json({ action: 'send_intro_email', label: 'Send intro email', score: 0.6, daysSinceLast, lastActivityAt })
  }
  if (daysSinceLast <= 7) {
    return res.json({ action: 'nurture', label: 'Keep nurturing — recent activity', score: 0.25, daysSinceLast, lastActivityAt })
  }
  if (daysSinceLast <= 14) {
    return res.json({ action: 'follow_up_call', label: 'Schedule a follow-up call', score: 0.8, daysSinceLast, lastActivityAt })
  }
  if (daysSinceLast <= 30) {
    return res.json({ action: 'reengage_offer', label: 'Send a re-engagement offer', score: 0.7, daysSinceLast, lastActivityAt })
  }

  // Fallback: win-back
  return res.json({ action: 'win_back', label: 'Start a win-back campaign', score: 0.9, daysSinceLast, lastActivityAt })
}

