import { users } from '../controllers/authController'
import { clients } from '../controllers/clientsController'
import { activities } from '../controllers/activitiesController'
import { saveClientsMap, saveActivitiesMap } from './persistence'
import { v4 as uuidv4 } from 'uuid'

function ensureSampleForOrg(orgId: string) {
  const existingClients = Array.from(clients.values()).filter(c => c.organizationId === orgId)

  const createdClients: any[] = []
  const createdActivities: any[] = []
  let updatedClients = 0
  let updatedActivities = 0

  const sampleClients = [
    { name: 'BrightCo', state: 'active' },
    { name: 'Nova Retail', state: 'active' },
    { name: 'OldTown LLC', state: 'active' },
    { name: 'Churned Corp', state: 'churned' },
    { name: 'QuickStart', state: 'active' },
    { name: 'Holiday Homes', state: 'active' },
  ]

  // choose org users to assign owners (prefer manager, then staff)
  const orgUsers = Array.from(users.values()).filter(u => u.organizationId === orgId)
  const manager = orgUsers.find((u:any)=>u.role==='manager')
  const staffs = orgUsers.filter((u:any)=>u.role==='staff')
  const assignPool = [manager?.email, ...staffs.map(s=>s.email)].filter(Boolean)

  for (let i = 0; i < sampleClients.length; i++) {
    const s = sampleClients[i]
    const found = existingClients.find(c => c.name && c.name.toLowerCase() === s.name.toLowerCase())
    let clientId: string
    let userId = assignPool[i % assignPool.length] || (orgUsers[0] && orgUsers[0].email) || 'alice@agency.test'

    if (found) {
      clientId = found.id
      // mark as demo if not already
      if (!(found as any).demo) {
        (found as any).demo = true
        clients.set(found.id, found)
        updatedClients++
      }
    } else {
      // create new client if org has fewer than 8 clients
      if (existingClients.length + createdClients.length >= 8) continue
      const id = `sample-${orgId}-${i+1}`
      const client = { id, name: s.name, email: `${s.name.replace(/\s+/g,'').toLowerCase()}@example.com`, clientState: s.state, createdAt: new Date().toISOString(), userId, organizationId: orgId, demo: true }
      clients.set(id, client)
      createdClients.push(client)
      clientId = id
    }

    // ensure activities for this client tell the intended story
    const acts = Array.from(activities.values()).filter(a => a.clientId === clientId && a.organizationId === orgId)

    if (s.name === 'BrightCo') {
      // ensure at least 5 recent interactions
      if (acts.length < 5) {
        for (let d = 12; d >= 0; d -= 3) {
          const date = new Date(); date.setDate(date.getDate() - d)
          const act = { id: uuidv4(), type: d%2? 'call':'meeting', description: `${s.name} touchpoint`, date: date.toISOString(), clientId, userId, organizationId: orgId, createdAt: new Date().toISOString(), activityStatus: 'completed' }
          activities.set(act.id, act)
          createdActivities.push(act)
        }
      }
    } else if (s.name === 'Nova Retail') {
      // ensure an activity ~21 days ago to make At Risk
      const twentyOneDays = new Date(); twentyOneDays.setDate(twentyOneDays.getDate() - 21)
      const has21 = acts.some(a => Math.abs(new Date(a.date).getTime() - twentyOneDays.getTime()) < (24*60*60*1000*3))
      if (!has21) {
        const act = { id: uuidv4(), type: 'call', description: 'Follow-up', date: twentyOneDays.toISOString(), clientId, userId, organizationId: orgId, createdAt: new Date().toISOString(), activityStatus: 'completed' }
        activities.set(act.id, act)
        createdActivities.push(act)
      }
    } else if (s.name === 'OldTown LLC') {
      // ensure irregular pattern: one old and one recent
      const hasOld = acts.some(a => (Date.now() - new Date(a.date).getTime()) > (1000*60*60*24*120))
      const hasRecent = acts.some(a => (Date.now() - new Date(a.date).getTime()) < (1000*60*60*24*30))
      if (!hasOld) {
        const old = new Date(); old.setMonth(old.getMonth() - 8)
        const oldAct = { id: uuidv4(), type: 'call', description: 'Old touch', date: old.toISOString(), clientId, userId, organizationId: orgId, createdAt: new Date().toISOString(), activityStatus: 'completed' }
        activities.set(oldAct.id, oldAct)
        createdActivities.push(oldAct)
      }
      if (!hasRecent) {
        const recent = new Date(); recent.setDate(recent.getDate() - 16)
        const recentAct = { id: uuidv4(), type: 'call', description: 'Ad-hoc support (irregular)', date: recent.toISOString(), clientId, userId, organizationId: orgId, createdAt: new Date().toISOString(), activityStatus: 'completed' }
        activities.set(recentAct.id, recentAct)
        createdActivities.push(recentAct)
      }
    } else if (s.name === 'Churned Corp') {
      // ensure a last account check in the past (older)
      const hasAny = acts.length > 0
      if (!hasAny) {
        const act = { id: uuidv4(), type: 'call', description: 'Last account check', date: '2024-04-02T09:00:00.000Z', clientId, userId, organizationId: orgId, createdAt: new Date().toISOString(), activityStatus: 'completed' }
        activities.set(act.id, act)
        createdActivities.push(act)
      }
    } else if (s.name === 'Holiday Homes') {
      // ensure scheduled future meeting
      const hasFuture = acts.some(a => new Date(a.date).getTime() > Date.now() && a.activityStatus === 'scheduled')
      if (!hasFuture) {
        const future = new Date(); future.setDate(future.getDate() + 7)
        const act = { id: uuidv4(), type: 'meeting', description: 'Site visit', date: future.toISOString(), clientId, userId, organizationId: orgId, createdAt: new Date().toISOString(), activityStatus: 'scheduled' }
        activities.set(act.id, act)
        createdActivities.push(act)
      }
    } else {
      // default touch
      if (acts.length === 0) {
        const date = new Date(); date.setDate(date.getDate() - 5)
        const act = { id: uuidv4(), type: 'call', description: 'Touch', date: date.toISOString(), clientId, userId, organizationId: orgId, createdAt: new Date().toISOString(), activityStatus: 'completed' }
        activities.set(act.id, act)
        createdActivities.push(act)
      }
    }
  }

  // always persist after potential updates
  saveClientsMap(clients)
  saveActivitiesMap(activities)

  return { addedClients: createdClients.length, addedActivities: createdActivities.length, updatedClients, updatedActivities }
}

export function seedAllOrgs() {
  const orgIds = new Set(Array.from(users.values()).map((u:any)=>u.organizationId))
  const summary: Record<string, { addedClients: number; addedActivities: number }> = {}
  orgIds.forEach(orgId => {
    summary[orgId] = ensureSampleForOrg(orgId)
  })
  return summary
}

// Optionally seed default 'org-1' if no users exist
if (Array.from(users.values()).length === 0) {
  // create default owner user and then seed
  users.set('alice@agency.test', { username: 'Alice Owner', email: 'alice@agency.test', role: 'owner', organizationId: 'org-1', passwordHash: '$2a$10$tQsBjet8GQqHEDXir2O/fO4Q8feV99INzbbkI0G2oef89goGBVpiS' })
  saveClientsMap(clients)
}

export default seedAllOrgs
