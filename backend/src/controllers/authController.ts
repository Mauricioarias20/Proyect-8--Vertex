import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'

import { loadUsersMap, saveUsersMap } from '../store/persistence'

// In-memory user store for initial scaffold. Replace with Postgres + raw SQL later.
// role: 'owner' | 'manager' | 'staff'
export const users = loadUsersMap()
const organizations = new Map<string, { id: string, name: string, createdAt: string }>()

// Migrate plaintext passwords from fixtures and ensure organizations exist
async function migrateUsers() {
  try {
    let migrated = false
    for (const entry of Array.from(users.entries())) {
      const email = entry[0]
      const u = entry[1] as any
      if (u.password && !u.passwordHash) {
        const hash = await bcrypt.hash(u.password as string, 10)
        u.passwordHash = hash
        delete u.password
        users.set(email, u)
        migrated = true
      }
      if (u.organizationId && !organizations.has(u.organizationId)) {
        organizations.set(u.organizationId, { id: u.organizationId, name: u.username + "'s Workspace", createdAt: new Date().toISOString() })
      }
    }
    if (migrated) saveUsersMap(users)
  } catch (err) {
    console.warn('Failed to migrate users', err)
  }
}

migrateUsers().catch(err => console.warn('Migration error', err))

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing fields' })

  if (users.has(email)) return res.status(409).json({ error: 'User already exists' })

  const salt = await bcrypt.genSalt(10)
  const passwordHash = await bcrypt.hash(password, salt)

  // simple lightweight roles: first registered user becomes owner, others are staff by default
  const isFirstUser = users.size === 0
  const role: 'owner'|'manager'|'staff' = isFirstUser ? 'owner' : 'staff'
  
  // Create organization for first user (owner of SaaS org)
  let organizationId: string
  if (isFirstUser) {
    organizationId = uuidv4()
    organizations.set(organizationId, { id: organizationId, name: username + "'s Workspace", createdAt: new Date().toISOString() })
  } else {
    // Use the owner's organization
    const ownerUser = Array.from(users.values()).find(u => u.role === 'owner')
    organizationId = ownerUser?.organizationId || uuidv4()
  }

  users.set(email, { username, email, passwordHash, role, organizationId })
  // persist users for dev fixtures
  saveUsersMap(users)

  console.log(`auth: registered user=${email} role=${role} organization=${organizationId}`)

  const token = jwt.sign({ email, username, role, organizationId }, JWT_SECRET, { expiresIn: '7d' })

  res.status(201).json({ token, user: { username, email, role, organizationId } })
}

// GET /api/team
export const listTeam = (req: Request & { user?: any }, res: Response) => {
  const organizationId = req.user!.organizationId
  const role = req.user!.role
  let members = Array.from(users.values()).filter(u => u.organizationId === organizationId).map(u => ({ username: u.username, email: u.email, role: u.role, organizationId: u.organizationId }))
  // staff can only see themselves
  if (role === 'staff') members = members.filter(m => m.email === req.user!.email)

  // compute last activity for members
  const { activities } = require('./activitiesController') as { activities: Map<string, any> }
  const lastMap: Record<string, string | null> = {}
  members.forEach(m => {
    const acts = Array.from(activities.values()).filter((a: any) => a.organizationId === organizationId && a.userId === m.email)
    if (acts.length) {
      const last = acts.map((a:any) => +new Date(a.date)).sort((x:number,y:number)=>y-x)[0]
      lastMap[m.email] = new Date(last).toISOString()
    } else lastMap[m.email] = null
  })

  res.json(members.map(m => ({ ...m, lastActivityAt: lastMap[m.email] })))
}

// PUT /api/team/:email
export const updateMember = (req: Request & { user?: any }, res: Response) => {
  const organizationId = req.user!.organizationId
  const actorRole = req.user!.role
  const email = req.params.email
  const { role: newRole } = req.body
  if (!newRole || !['owner','manager','staff'].includes(newRole)) return res.status(400).json({ error: 'Invalid role' })

  const existing = users.get(email)
  if (!existing || existing.organizationId !== organizationId) return res.status(404).json({ error: 'Not found' })

  // only owner can assign owner or manager; manager can only assign staff and cannot modify owner/manager
  if (actorRole === 'manager') {
    if (existing.role !== 'staff') return res.status(403).json({ error: 'Managers can only modify staff members' })
    if (newRole !== 'staff') return res.status(403).json({ error: 'Managers cannot promote to manager/owner' })
  }
  if (actorRole !== 'owner' && actorRole !== 'manager') return res.status(403).json({ error: 'Permission denied' })

  existing.role = newRole as any
  users.set(email, existing)
  // persist role change
  saveUsersMap(users)
  res.json({ username: existing.username, email: existing.email, role: existing.role, organizationId: existing.organizationId })
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Missing fields' })

  const user = users.get(email)
  if (!user) {
    console.warn(`auth: failed login, user not found: ${email}`)
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) {
    console.warn(`auth: failed login, bad password for ${email}`)
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign({ email: user.email, username: user.username, role: user.role, organizationId: user.organizationId }, JWT_SECRET, { expiresIn: '7d' })

  console.log(`auth: login success user=${email} role=${user.role} organization=${user.organizationId}`)

  res.json({ token, user: { username: user.username, email: user.email, role: user.role, organizationId: user.organizationId } })
}
