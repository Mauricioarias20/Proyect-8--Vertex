import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(__dirname, '..', '..', 'data')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function loadJSON<T>(file: string, defaultVal: T): T {
  try {
    ensureDir()
    const fp = path.join(DATA_DIR, file)
    if (!fs.existsSync(fp)) return defaultVal
    const raw = fs.readFileSync(fp, 'utf8')
    return JSON.parse(raw) as T
  } catch (err) {
    console.warn('Failed to read', file, err)
    return defaultVal
  }
}

function saveJSON(file: string, data: any) {
  try {
    ensureDir()
    const fp = path.join(DATA_DIR, file)
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8')
  } catch (err) {
    console.warn('Failed to write', file, err)
  }
}

export function loadClientsMap() {
  let arr = loadJSON<any[]>('clients.json', [])
  if (!arr || arr.length === 0) {
    arr = [
      { id: 'cli-1', name: 'BrightCo', email: 'hello@brightco.com', clientState: 'active', createdAt: '2024-11-01T09:00:00.000Z', userId: 'carla@agency.test', organizationId: 'org-1' },
      { id: 'cli-2', name: 'Nova Retail', email: 'contact@novaretail.com', clientState: 'active', createdAt: '2025-06-01T08:30:00.000Z', userId: 'bob@agency.test', organizationId: 'org-1' },
      { id: 'cli-3', name: 'OldTown LLC', email: 'info@oldtown.com', clientState: 'active', createdAt: '2023-03-01T10:00:00.000Z', userId: 'dan@agency.test', organizationId: 'org-1' },
      { id: 'cli-4', name: 'Churned Corp', email: 'accounts@churnedcorp.com', clientState: 'churned', createdAt: '2022-01-10T12:00:00.000Z', userId: 'carla@agency.test', organizationId: 'org-1' },
      { id: 'cli-5', name: 'QuickStart', email: 'team@quickstart.io', clientState: 'active', createdAt: '2025-02-14T09:30:00.000Z', userId: 'emma@agency.test', organizationId: 'org-1' },
      { id: 'cli-6', name: 'Holiday Homes', email: 'bookings@holidayhomes.com', clientState: 'active', createdAt: '2024-09-20T11:00:00.000Z', userId: 'carla@agency.test', organizationId: 'org-1' },
      { id: 'cli-7', name: 'Solo Venture', email: 'founder@soloventure.com', clientState: 'lead', createdAt: '2025-07-05T16:00:00.000Z', userId: 'dan@agency.test', organizationId: 'org-1' }
    ]
    saveJSON('clients.json', arr)
  }
  return new Map(arr.map(c => [c.id, c]))
}

export function saveClientsMap(m: Map<string, any>) {
  saveJSON('clients.json', Array.from(m.values()))
} 

export function loadActivitiesMap() {
  let arr = loadJSON<any[]>('activities.json', [])
  if (!arr || arr.length === 0) {
    arr = [
      { id: 'act-1', type: 'call', description: 'Intro discovery call', date: '2025-11-15T10:00:00.000Z', clientId: 'cli-1', userId: 'carla@agency.test', organizationId: 'org-1', createdAt: '2025-11-15T10:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-2', type: 'meeting', description: 'Project scoping', date: '2025-11-22T14:00:00.000Z', clientId: 'cli-1', userId: 'carla@agency.test', organizationId: 'org-1', createdAt: '2025-11-22T14:10:00.000Z', activityStatus: 'completed' },
      { id: 'act-3', type: 'call', description: 'Status check', date: '2025-12-01T09:30:00.000Z', clientId: 'cli-1', userId: 'carla@agency.test', organizationId: 'org-1', createdAt: '2025-12-01T09:35:00.000Z', activityStatus: 'completed' },
      { id: 'act-4', type: 'proposal', description: 'Sent proposal and pricing', date: '2025-12-10T12:00:00.000Z', clientId: 'cli-1', userId: 'carla@agency.test', organizationId: 'org-1', createdAt: '2025-12-10T12:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-5', type: 'call', description: 'Follow-up call', date: '2025-12-20T11:00:00.000Z', clientId: 'cli-1', userId: 'carla@agency.test', organizationId: 'org-1', createdAt: '2025-12-20T11:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-6', type: 'meeting', description: 'Wrap-up meeting', date: '2025-12-26T15:00:00.000Z', clientId: 'cli-1', userId: 'carla@agency.test', organizationId: 'org-1', createdAt: '2025-12-26T15:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-7', type: 'call', description: 'Check-in', date: '2025-11-01T10:00:00.000Z', clientId: 'cli-2', userId: 'bob@agency.test', organizationId: 'org-1', createdAt: '2025-11-01T10:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-8', type: 'call', description: 'Follow-up', date: '2025-12-07T09:00:00.000Z', clientId: 'cli-2', userId: 'bob@agency.test', organizationId: 'org-1', createdAt: '2025-12-07T09:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-9', type: 'call', description: 'Initial discovery', date: '2025-06-01T10:00:00.000Z', clientId: 'cli-3', userId: 'dan@agency.test', organizationId: 'org-1', createdAt: '2025-06-01T10:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-10', type: 'meeting', description: 'Re-engagement', date: '2025-10-15T13:00:00.000Z', clientId: 'cli-3', userId: 'dan@agency.test', organizationId: 'org-1', createdAt: '2025-10-15T13:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-11', type: 'call', description: 'Ad-hoc support (irregular)', date: '2025-12-12T11:00:00.000Z', clientId: 'cli-3', userId: 'dan@agency.test', organizationId: 'org-1', createdAt: '2025-12-12T11:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-12', type: 'call', description: 'Account check', date: '2025-04-02T09:00:00.000Z', clientId: 'cli-4', userId: 'carla@agency.test', organizationId: 'org-1', createdAt: '2025-04-02T09:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-13', type: 'call', description: 'Kickoff', date: '2025-12-05T10:00:00.000Z', clientId: 'cli-5', userId: 'emma@agency.test', organizationId: 'org-1', createdAt: '2025-12-05T10:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-14', type: 'meeting', description: 'Product review', date: '2025-12-15T14:00:00.000Z', clientId: 'cli-5', userId: 'emma@agency.test', organizationId: 'org-1', createdAt: '2025-12-15T14:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-15', type: 'meeting', description: 'Holiday Homes site visit', date: '2026-01-03T09:00:00.000Z', clientId: 'cli-6', userId: 'carla@agency.test', organizationId: 'org-1', createdAt: '2025-12-01T12:00:00.000Z', activityStatus: 'scheduled' },
      { id: 'act-16', type: 'task', description: 'Prepare onboarding checklist', date: '2025-11-20T08:00:00.000Z', clientId: 'cli-7', userId: 'dan@agency.test', organizationId: 'org-1', createdAt: '2025-11-20T08:05:00.000Z', activityStatus: 'completed' },
      { id: 'act-17', type: 'call', description: 'Missed follow-up', date: '2025-11-30T10:00:00.000Z', clientId: 'cli-2', userId: 'bob@agency.test', organizationId: 'org-1', createdAt: '2025-11-30T10:05:00.000Z', activityStatus: 'missed' }
    ]
    saveJSON('activities.json', arr)
  }
  return new Map(arr.map(a => [a.id, a]))
}

export function saveActivitiesMap(m: Map<string, any>) {
  saveJSON('activities.json', Array.from(m.values()))
}

export function loadUsersMap() {
  let arr = loadJSON<any[]>('users.json', [])
  if (!arr || arr.length === 0) {
    // default example users (passwords already hashed for dev fixtures)
    arr = [
      { username: 'Alice Owner', email: 'alice@agency.test', role: 'owner', organizationId: 'org-1', passwordHash: '$2a$10$tQsBjet8GQqHEDXir2O/fO4Q8feV99INzbbkI0G2oef89goGBVpiS' },
      { username: 'Bob Manager', email: 'bob@agency.test', role: 'manager', organizationId: 'org-1', passwordHash: '$2a$10$evTy319FuJAyFmmZPUWBxekb.f2GGhItsquFiWElnOxEdfZbQOLxa' },
      { username: 'Carla Rep', email: 'carla@agency.test', role: 'staff', organizationId: 'org-1', passwordHash: '$2a$10$hL7uICe107YwKgMGto189Oj5IG3k1t99zvPrLtBLplvLk4yvpWOSK' },
      { username: 'Dan Rep', email: 'dan@agency.test', role: 'staff', organizationId: 'org-1', passwordHash: '$2a$10$HlM5eLRMq7Fwd8Zf0FUO3.2KTEnZrXm/V37S91OkaoVkmpO8VhQDm' },
      { username: 'Emma Rep', email: 'emma@agency.test', role: 'staff', organizationId: 'org-1', passwordHash: '$2a$10$b6OFN0JTSwoaREooUPZTVuB4P/HR.657zLlamFtGhc8l/p5F7cW7W' }
    ]
    saveJSON('users.json', arr)
  }
  return new Map(arr.map(u => [u.email, u]))
}

export function saveUsersMap(m: Map<string, any>) {
  saveJSON('users.json', Array.from(m.values()))
} 
