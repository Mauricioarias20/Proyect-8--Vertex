import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export type AuthPayload = { email: string; username?: string; role: 'owner'|'manager'|'staff'; organizationId: string }

export const requireAuth = (req: Request & { user?: AuthPayload }, res: Response, next: NextFunction) => {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Missing or invalid authorization header' })
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    req.user = payload
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

// require one of the provided roles
export const requireRoles = (...roles: AuthPayload['role'][]) => {
  return (req: Request & { user?: AuthPayload }, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Permission denied' })
    next()
  }
}

export const requireOwner = (req: Request & { user?: AuthPayload }, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'owner') return res.status(403).json({ error: 'Permission denied' })
  next()
}
