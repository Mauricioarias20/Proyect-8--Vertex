import { Request, Response } from 'express'
import { clients, computeClientHealth } from './clientsController'
import { activities } from './activitiesController'

const denyStaff = (req: Request & { user?: any }, res: Response) => {
  if (req.user?.role === 'staff') {
    // Allow staff to view stats if the org has demo data seeded (for demo mode)
    const organizationId = req.user!.organizationId
    const hasDemo = Array.from(clients.values()).some(c => c.organizationId === organizationId && (c as any).demo === true)
    if (!hasDemo) { res.status(403).json({ error: 'Permission denied' }); return true }
  }
  return false
}

// helper: top N
const topN = (arr: any[], n = 10) => arr.sort((a,b)=> (b.score ?? b.count ?? 0) - (a.score ?? a.count ?? 0)).slice(0, n)

// GET /api/stats/clients-active
export const clientsActiveCount = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const count = Array.from(clients.values()).filter(c => c.organizationId === organizationId && c.clientState === 'active').length
  res.json({ count })
}

// GET /api/stats/activities-per-week?weeks=12
export const activitiesPerWeek = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const weeks = Math.max(1, Math.min(52, parseInt((req.query.weeks as string) || '12')))
  const now = new Date()

  // helper: get monday start of week
  const weekStart = (d: Date) => {
    const dt = new Date(d)
    const day = (dt.getDay() + 6) % 7 // make Monday=0
    dt.setHours(0,0,0,0)
    dt.setDate(dt.getDate() - day)
    return dt
  }

  // prepare bins for last `weeks` weeks
  const bins: { start: Date; label: string; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = weekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7))
    const label = `${start.toISOString().slice(0,10)}`
    bins.push({ start, label, count: 0 })
  }

  // count activities belonging to organization
  Array.from(activities.values()).forEach(a => {
    if (a.organizationId !== organizationId) return
    const d = new Date(a.date)
    // find bin where d >= start and < start + 7 days
    for (const b of bins) {
      const start = b.start.getTime()
      const end = start + 7 * 24 * 60 * 60 * 1000
      if (d.getTime() >= start && d.getTime() < end) { b.count += 1; break }
    }
  })

  res.json(bins.map(b => ({ weekStart: b.label, count: b.count })))
}

// GET /api/stats/upcoming?limit=10
export const upcomingActivities = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '10')))
  const now = Date.now()
  const items = Array.from(activities.values())
    .filter(a => a.organizationId === organizationId && new Date(a.date).getTime() >= now)
    .sort((a,b) => +new Date(a.date) - +new Date(b.date))
    .slice(0, limit)
  res.json(items)
}

// GET /api/stats/clients-no-recent?days=30
export const clientsNoRecent = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const days = Math.max(1, Math.min(365, parseInt((req.query.days as string) || '30')))
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000

  const myClients = Array.from(clients.values()).filter(c => c.organizationId === organizationId)
  const result = myClients.map(c => {
    const acts = Array.from(activities.values()).filter(a => a.clientId === c.id && a.organizationId === organizationId)
    const last = acts.length ? acts.map(a => +new Date(a.date)).sort((x,y)=>y-x)[0] : null
    return { client: c, lastActivityAt: last ? new Date(last).toISOString() : null, daysSinceLast: last ? Math.round((Date.now() - last)/(24*60*60*1000)) : null }
  }).filter(r => !r.lastActivityAt || (r.lastActivityAt && +new Date(r.lastActivityAt) < threshold))

  res.json(result)
}

// GET /api/stats/clients-most-at-risk?limit=10
export const clientsMostAtRisk = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '10')))

  const myClients = Array.from(clients.values()).filter(c => c.organizationId === organizationId)
  const ranked = myClients.map(c => ({ client: c, health: computeClientHealth(c, organizationId) }))
  ranked.sort((a,b) => a.health.score - b.health.score)
  res.json(ranked.slice(0, limit))
}

// GET /api/stats/clients-over-time?days=30
export const clientsOverTime = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const days = Math.max(1, Math.min(365, parseInt((req.query.days as string) || '30')))
  const now = new Date()

  // prepare bins for last `days` days
  const bins: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    d.setHours(0,0,0,0)
    bins.push({ date: d.toISOString().slice(0,10), count: 0 })
  }

  Array.from(clients.values()).forEach(c => {
    if (c.organizationId !== organizationId) return
    const created = new Date(c.createdAt)
    const dateStr = created.toISOString().slice(0,10)
    const bin = bins.find(b => b.date === dateStr)
    if (bin) bin.count += 1
  })

  // Also include clients created before the window in the initial accumulator
  const beforeCount = Array.from(clients.values()).filter(c => c.organizationId === organizationId && new Date(c.createdAt).getTime() < new Date(bins[0].date + 'T00:00:00Z').getTime()).length
  let acc = beforeCount
  const cumulative = bins.map(b => ({ date: b.date, total: acc += b.count }))
  res.json(cumulative)
}

// GET /api/stats/avg-time-between-contacts?days=365
export const avgTimeBetweenContacts = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const days = Math.max(30, Math.min(3650, parseInt((req.query.days as string) || '365')))
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000

  const clientAverages: Array<{ clientId: string; name: string; avgDays: number | null; samples: number }> = []

  Array.from(clients.values()).forEach(c => {
    if (c.organizationId !== organizationId) return
    const acts = Array.from(activities.values()).filter(a => a.organizationId === organizationId && a.clientId === c.id && new Date(a.date).getTime() >= threshold).map(a => +new Date(a.date)).sort((x,y)=>x-y)
    if (acts.length < 2) {
      clientAverages.push({ clientId: c.id, name: c.name, avgDays: null, samples: acts.length })
      return
    }
    let sum = 0
    let count = 0
    for (let i = 1; i < acts.length; i++) { sum += (acts[i] - acts[i-1]) / (24*60*60*1000); count++ }
    clientAverages.push({ clientId: c.id, name: c.name, avgDays: sum / count, samples: count })
  })

  const valid = clientAverages.filter(ca => ca.avgDays !== null)
  const overallAvg = valid.length ? (valid.reduce((s, v) => s + (v.avgDays as number), 0) / valid.length) : null
  res.json({ overallAvgDays: overallAvg, perClient: clientAverages.sort((a,b)=> (a.avgDays ?? 1e9) - (b.avgDays ?? 1e9)) })
}

// GET /api/stats/churned-per-month?months=12
export const churnedPerMonth = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const months = Math.max(1, Math.min(60, parseInt((req.query.months as string) || '12')))
  const now = new Date()

  // prepare bins for months
  const bins: { month: string; count: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    bins.push({ month: d.toISOString().slice(0,7), count: 0 })
  }

  // consider client as churned if clientState === 'churned' OR daysSinceLast > 30
  Array.from(clients.values()).forEach(c => {
    if (c.organizationId !== organizationId) return
    const acts = Array.from(activities.values()).filter(a => a.organizationId === organizationId && a.clientId === c.id)
    const last = acts.length ? acts.map(a => +new Date(a.date)).sort((x,y)=>y-x)[0] : null
    const daysSinceLast = last ? Math.round((Date.now() - last)/(24*60*60*1000)) : null
    const isChurned = c.clientState === 'churned' || (daysSinceLast !== null && daysSinceLast > 30)
    if (!isChurned) return
    const monthKey = last ? new Date(last).toISOString().slice(0,7) : new Date(c.createdAt).toISOString().slice(0,7)
    const bin = bins.find(b => b.month === monthKey)
    if (bin) bin.count += 1
  })

  res.json(bins)
}
// GET /api/stats/activities-by-type?days=30
export const activitiesByType = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const days = Math.max(1, Math.min(365, parseInt((req.query.days as string) || '30')))
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000

  const counts: Record<string, number> = {}
  Array.from(activities.values()).forEach(a => {
    if (a.organizationId !== organizationId) return
    if (new Date(a.date).getTime() < threshold) return
    counts[a.type] = (counts[a.type] || 0) + 1
  })

  res.json(Object.keys(counts).map(k => ({ type: k, count: counts[k] })))
}

// GET /api/stats/most-frequent-activities?days=30&limit=10
export const mostFrequentActivities = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const limit = Math.max(1, Math.min(100, parseInt((req.query.limit as string) || '10')))
  const days = Math.max(1, Math.min(365, parseInt((req.query.days as string) || '30')))
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000

  const counts: Record<string, number> = {}
  Array.from(activities.values()).forEach(a => {
    if (a.organizationId !== req.user!.organizationId) return
    if (new Date(a.date).getTime() < threshold) return
    counts[a.type] = (counts[a.type] || 0) + 1
  })

  const items = Object.keys(counts).map(k => ({ type: k, count: counts[k] }))
  items.sort((a,b)=> b.count - a.count)
  res.json(items.slice(0, limit))
}

// GET /api/stats/activity-frequency?days=7
export const activityFrequency = (req: Request & { user?: any }, res: Response) => {
  if (denyStaff(req, res)) return
  const organizationId = req.user!.organizationId
  const days = Math.max(1, Math.min(365, parseInt((req.query.days as string) || '7')))
  const now = new Date()

  const bins: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    d.setHours(0,0,0,0)
    bins.push({ date: d.toISOString().slice(0,10), count: 0 })
  }

  Array.from(activities.values()).forEach(a => {
    if (a.organizationId !== organizationId) return
    const dateStr = new Date(a.date).toISOString().slice(0,10)
    const bin = bins.find(b => b.date === dateStr)
    if (bin) bin.count += 1
  })

  res.json(bins)
}