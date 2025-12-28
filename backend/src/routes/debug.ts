import express from 'express'
import { users } from '../controllers/authController'
import { clients } from '../controllers/clientsController'
import { activities } from '../controllers/activitiesController'

const router = express.Router()

// GET /api/debug/fixtures - return counts and sample data for quick verification
router.get('/fixtures', (req, res) => {
  const userList = Array.from(users.values()).map(u => ({ username: u.username, email: u.email, role: u.role, organizationId: u.organizationId }))
  const clientList = Array.from(clients.values()).map(c => ({ id: c.id, name: c.name, userId: c.userId, state: c.clientState, organizationId: c.organizationId }))
  const activitySample = Array.from(activities.values()).slice(0, 10).map(a => ({ id: a.id, type: a.type, clientId: a.clientId, date: a.date, status: a.activityStatus, organizationId: a.organizationId }))
  res.json({ users: userList.length, clients: clientList.length, activities: activities.size, sample: { users: userList, clients: clientList.slice(0,10), activities: activitySample } })
})

// GET /api/debug/public - return seeded clients and activities (ignores auth/scoping) for quick verification in UI
router.get('/public', (req, res) => {
  const clientList = Array.from(clients.values()).map(c => ({ id: c.id, name: c.name, userId: c.userId, state: c.clientState, organizationId: c.organizationId, demo: (c as any).demo || false }))
  const activityList = Array.from(activities.values()).map(a => ({ id: a.id, type: a.type, clientId: a.clientId, date: a.date, status: a.activityStatus, organizationId: a.organizationId }))
  res.json({ clients: clientList, activities: activityList })
})

// POST /api/debug/seed - force seeding default mocks for all organizations
router.post('/seed', (req, res) => {
  const seedAllOrgs = require('../store/seed').default
  const result = seedAllOrgs()
  res.json({ seeded: result })
})

// GET /api/debug/seed - convenience endpoint (callable from browser)
router.get('/seed', (req, res) => {
  const seedAllOrgs = require('../store/seed').default
  const result = seedAllOrgs()
  // simplify response for browser readability
  const summary = Object.keys(result).map(orgId => ({ organizationId: orgId, ...result[orgId] }))
  res.json({ seeded: summary })
})

// GET /api/debug/stats/:orgId - compute main stats for an organization (ignores role checks)
router.get('/stats/:orgId', (req, res) => {
  const orgId = req.params.orgId

  // activities by type (last 30 days)
  const days = 30
  const threshold = Date.now() - days * 24 * 60 * 60 * 1000
  const counts: Record<string, number> = {}
  Array.from(activities.values()).forEach(a => {
    if (a.organizationId !== orgId) return
    if (new Date(a.date).getTime() < threshold) return
    counts[a.type] = (counts[a.type] || 0) + 1
  })
  const activitiesByType = Object.keys(counts).map(k => ({ type: k, count: counts[k] }))

  // activities per week (12 weeks)
  const weeks = 12
  const now = new Date()
  const weekStart = (d: Date) => {
    const dt = new Date(d)
    const day = (dt.getDay() + 6) % 7
    dt.setHours(0,0,0,0)
    dt.setDate(dt.getDate() - day)
    return dt
  }
  const bins: { start: Date; label: string; count: number }[] = []
  for (let i = weeks - 1; i >= 0; i--) {
    const start = weekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7))
    const label = `${start.toISOString().slice(0,10)}`
    bins.push({ start, label, count: 0 })
  }
  Array.from(activities.values()).forEach(a => {
    if (a.organizationId !== orgId) return
    const d = new Date(a.date)
    for (const b of bins) {
      const start = b.start.getTime()
      const end = start + 7 * 24 * 60 * 60 * 1000
      if (d.getTime() >= start && d.getTime() < end) { b.count += 1; break }
    }
  })
  const activitiesPerWeek = bins.map(b => ({ weekStart: b.label, count: b.count }))

  // clients most at risk (top 8)
  const myClients = Array.from(clients.values()).filter(c => c.organizationId === orgId)
  const ranked = myClients.map(c => ({ client: c, health: require('../controllers/clientsController').computeClientHealth(c, orgId) }))
  ranked.sort((a,b) => a.health.score - b.health.score)
  const clientsMostAtRisk = ranked.slice(0,8)

  // avg time between contacts (365 days)
  const daysWindow = 365
  const thresholdWindow = Date.now() - daysWindow * 24 * 60 * 60 * 1000
  const clientAverages: Array<{ clientId: string; name: string; avgDays: number | null; samples: number }> = []
  Array.from(clients.values()).forEach(c => {
    if (c.organizationId !== orgId) return
    const acts = Array.from(activities.values()).filter(a => a.organizationId === orgId && a.clientId === c.id && new Date(a.date).getTime() >= thresholdWindow).map(a => +new Date(a.date)).sort((x,y)=>x-y)
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
  const avgTimeBetweenContacts = { overallAvgDays: overallAvg, perClient: clientAverages.sort((a,b)=> (a.avgDays ?? 1e9) - (b.avgDays ?? 1e9)) }

  // churned per month (12 months)
  const months = 12
  const nowDate = new Date()
  const monthBins: { month: string; count: number }[] = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1)
    monthBins.push({ month: d.toISOString().slice(0,7), count: 0 })
  }
  Array.from(clients.values()).forEach(c => {
    if (c.organizationId !== orgId) return
    const acts = Array.from(activities.values()).filter(a => a.organizationId === orgId && a.clientId === c.id)
    const last = acts.length ? acts.map(a => +new Date(a.date)).sort((x,y)=>y-x)[0] : null
    const daysSinceLast = last ? Math.round((Date.now() - last)/(24*60*60*1000)) : null
    const isChurned = c.clientState === 'churned' || (daysSinceLast !== null && daysSinceLast > 30)
    if (!isChurned) return
    const monthKey = last ? new Date(last).toISOString().slice(0,7) : new Date(c.createdAt).toISOString().slice(0,7)
    const bin = monthBins.find(b => b.month === monthKey)
    if (bin) bin.count += 1
  })

  res.json({ activitiesByType, activitiesPerWeek, clientsMostAtRisk, avgTimeBetweenContacts, churnedPerMonth: monthBins })
})

export default router
